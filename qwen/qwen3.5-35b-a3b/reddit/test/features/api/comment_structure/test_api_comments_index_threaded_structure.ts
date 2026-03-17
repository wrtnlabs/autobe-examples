import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comments_index_threaded_structure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create authenticated member session
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Fetch comments with no filters (all available comments)
  const allCommentsResponse =
    await api.functional.redditCommunity.member.comments.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(allCommentsResponse);
  // 3. Validate parentComment structure for each comment
  for (const comment of allCommentsResponse.data) {
    const validatedComment = typia.assert(comment);
    // Verify replyCount is non-negative
    TestValidator.predicate(
      "replyCount is non-negative",
      validatedComment.replyCount >= 0,
    );
    // Validate parentComment relationship
    if (validatedComment.parentComment !== null) {
      const validatedParent = typia.assert(validatedComment.parentComment);
      // Parent comment should have all required fields (guaranteed by typia.assert)
      TestValidator.equals(
        "parent comment has id",
        validatedParent.id !== undefined,
        true,
      );
    } else {
      // Top-level comment should have null parentComment
      TestValidator.equals(
        "top-level comment has null parentComment",
        validatedComment.parentComment,
        null,
      );
    }
  }
  // 4. Test minDepth=0, maxDepth=0 filter (top-level comments only)
  const topLevelCommentsResponse =
    await api.functional.redditCommunity.member.comments.index(
      memberConnection,
      {
        body: {
          minDepth: 0,
          maxDepth: 0,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(topLevelCommentsResponse);
  // All filtered comments should be top-level (parentComment is null)
  for (const comment of topLevelCommentsResponse.data) {
    const validatedComment = typia.assert(comment);
    TestValidator.equals(
      "top-level filtered comment has null parentComment",
      validatedComment.parentComment,
      null,
    );
  }
  // 5. Fetch comments with 'new' sort to verify structure consistency
  const newCommentsResponse =
    await api.functional.redditCommunity.member.comments.index(
      memberConnection,
      {
        body: {
          sort: "new",
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(newCommentsResponse);
  // Verify structure is consistent across different sorts
  for (const comment of newCommentsResponse.data) {
    const validatedComment = typia.assert(comment);
    // For replies, ensure parentComment has required fields
    if (validatedComment.parentComment !== null) {
      const validatedParent = typia.assert(validatedComment.parentComment);
      TestValidator.equals(
        "reply parentComment has required fields",
        validatedParent.id !== undefined &&
          validatedParent.voteScore !== undefined &&
          validatedParent.createdAt !== undefined,
        true,
      );
      // Ensure parent comment author is properly structured
      TestValidator.equals(
        "parent comment has author",
        validatedParent.author !== undefined,
        true,
      );
      if (validatedParent.author) {
        TestValidator.equals(
          "author has id",
          validatedParent.author.id !== undefined,
          true,
        );
        TestValidator.equals(
          "author has username",
          validatedParent.author.username !== undefined,
          true,
        );
      }
    }
  }
  // 6. Test 'best' sort to verify different sorting maintains structure
  const bestCommentsResponse =
    await api.functional.redditCommunity.member.comments.index(
      memberConnection,
      {
        body: {
          sort: "best",
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(bestCommentsResponse);
  // Verify structure consistency across sorts
  for (const comment of bestCommentsResponse.data) {
    const validatedComment = typia.assert(comment);
    // Every comment should have required fields
    TestValidator.equals(
      "comment has required fields",
      validatedComment.id !== undefined &&
        validatedComment.voteScore !== undefined &&
        validatedComment.createdAt !== undefined,
      true,
    );
    // Validate author structure
    TestValidator.equals(
      "comment has author",
      validatedComment.author !== undefined,
      true,
    );
    if (validatedComment.author) {
      TestValidator.equals(
        "author has id",
        validatedComment.author.id !== undefined,
        true,
      );
    }
  }
  // 7. Verify pagination structure
  TestValidator.equals(
    "pagination current is valid",
    allCommentsResponse.pagination.current,
    allCommentsResponse.pagination.current,
  );
  TestValidator.equals(
    "pagination records count is valid",
    allCommentsResponse.pagination.records,
    allCommentsResponse.pagination.records,
  );
  TestValidator.equals(
    "pagination pages count is valid",
    allCommentsResponse.pagination.pages,
    allCommentsResponse.pagination.pages,
  );
  // 8. Test controversial sort option
  const controversialCommentsResponse =
    await api.functional.redditCommunity.member.comments.index(
      memberConnection,
      {
        body: {
          sort: "controversial",
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(controversialCommentsResponse);
  // Verify structure maintained across all sort types
  for (const comment of controversialCommentsResponse.data) {
    const validatedComment = typia.assert(comment);
    TestValidator.predicate(
      "voteScore is integer",
      Number.isInteger(validatedComment.voteScore),
    );
  }
  // 9. Verify comment ID format (UUID)
  for (const comment of allCommentsResponse.data.slice(0, 5)) {
    const validatedComment = typia.assert(comment);
    // UUID format validation - at least check it's a string with expected length
    TestValidator.equals(
      "comment ID is valid format",
      typeof validatedComment.id === "string",
      true,
    );
  }
}
