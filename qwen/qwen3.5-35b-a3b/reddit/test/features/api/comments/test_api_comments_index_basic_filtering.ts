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

export async function test_api_comments_index_basic_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member session
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Call comments index endpoint with default parameters
  const result = await api.functional.redditCommunity.member.comments.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(result);
  // 3. Validate pagination structure
  TestValidator.equals("pagination.current", result.pagination.current, 1);
  TestValidator.equals("pagination.limit", result.pagination.limit, 20);
  TestValidator.predicate(
    "pagination.records >= 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages >= 0",
    result.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination.pages calculation",
    result.pagination.pages,
    result.pagination.records === 0
      ? 0
      : Math.ceil(result.pagination.records / result.pagination.limit),
  );
  // 4. Validate each comment structure
  for (const comment of result.data) {
    typia.assert(comment);
    TestValidator.equals("comment id is UUID", comment.id.length, 36);
    TestValidator.equals(
      "comment voteScore is number",
      typeof comment.voteScore,
      "number",
    );
    TestValidator.predicate(
      "comment createdAt is ISO date-time",
      comment.createdAt.length > 0,
    );
    TestValidator.equals(
      "comment replyCount is number",
      typeof comment.replyCount,
      "number",
    );
    TestValidator.predicate(
      "comment parentComment is null or ISummary",
      comment.parentComment === null || comment.parentComment !== null,
    );
    // Validate author structure
    typia.assert(comment.author);
    TestValidator.equals("author id is UUID", comment.author.id.length, 36);
    TestValidator.equals(
      "author username is string",
      typeof comment.author.username,
      "string",
    );
    TestValidator.predicate(
      "author created_at is date-time",
      comment.author.created_at.length > 0,
    );
  }
  // 5. Verify sorting by 'best' (vote_score DESC, created_at DESC)
  if (result.data.length > 1) {
    for (let i = 1; i < result.data.length; i++) {
      const prev = result.data[i - 1];
      const curr = result.data[i];
      if (prev.voteScore !== curr.voteScore) {
        // Higher vote score should come first
        TestValidator.predicate(
          "sorting by vote score DESC",
          prev.voteScore > curr.voteScore,
        );
      } else {
        // Same vote score, newer created_at should come first
        TestValidator.predicate(
          "sorting by created_at DESC (same vote score)",
          new Date(prev.createdAt) >= new Date(curr.createdAt),
        );
      }
    }
  }
  // 6. Verify vote scores and reply counts are integers
  for (const comment of result.data) {
    TestValidator.predicate(
      "voteScore is int32",
      Number.isInteger(comment.voteScore),
    );
    TestValidator.predicate(
      "replyCount is int32",
      Number.isInteger(comment.replyCount),
    );
  }
}
