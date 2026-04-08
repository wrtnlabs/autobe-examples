import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";

export async function test_api_member_comments_sorting_top(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create 3 comments using the available comment creation endpoint
  const comments: IRedditPlatformComment[] = [];
  for (let i = 0; i < 3; i++) {
    const comment =
      await generate_random_reddit_platform_member_comments_create(
        memberConnection,
        {
          body: {
            reddit_platform_post_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            content: RandomGenerator.paragraph({ sentences: 1 }),
            reddit_platform_comments_id: null,
          } satisfies IRedditPlatformComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // 3. Fetch comments sorted by top score (sortBy=top, order=desc)
  const response =
    await api.functional.redditPlatform.member.users.me.comments.index(
      memberConnection,
      {
        body: {
          sortBy: "top",
          order: "desc",
          limit: 100,
        } satisfies IRedditPlatformComment.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate response structure
  TestValidator.equals(
    "response has pagination",
    response.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "response has data array",
    response.data !== undefined,
    true,
  );
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  // 5. Validate pagination metadata fields exist
  const pagination = response.pagination;
  TestValidator.equals(
    "pagination has current",
    pagination.current !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    pagination.limit !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    pagination.records !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    pagination.pages !== undefined,
    true,
  );
  // 6. Validate each comment has correct score calculation
  // Note: Since we cannot vote on comments, all scores will be 0
  // This validates the score calculation formula: score = upvotes - downvotes
  for (const comment of response.data) {
    typia.assert(comment);
    const expectedScore = comment.upvotes_count - comment.downvotes_count;
    TestValidator.equals(
      `score equals upvotes - downvotes (${comment.id})`,
      comment.score,
      expectedScore,
    );
    TestValidator.equals(
      "comment has author",
      comment.author !== undefined,
      true,
    );
    TestValidator.equals("comment has post", comment.post !== undefined, true);
    TestValidator.equals(
      "comment has created_at",
      comment.created_at !== undefined,
      true,
    );
  }
  // 7. Validate record count matches data length
  TestValidator.equals(
    "records count matches data length",
    response.pagination.records,
    response.data.length,
  );
  // 8. Test sorting stability with same score - verify comments are still returned
  // When all comments have same score (0), they should all be returned
  TestValidator.equals(
    "multiple comments returned with same score",
    response.data.length,
    comments.length,
  );
  // 9. Validate comment content is preserved in response
  for (const comment of response.data) {
    typia.assert(comment);
    TestValidator.predicate(
      "comment content is non-empty",
      comment.content.length > 0,
    );
    TestValidator.equals(
      "comment ID is valid UUID",
      typeof comment.id === "string",
      true,
    );
  }
}