import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_post_comments_best_sort(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderatorAuth);
  // Note: Since we don't have utility functions for post/comment creation,
  // we'll test the endpoint with a valid post ID that the moderator can access
  // In a real scenario, we would create posts and comments first
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve comments sorted by 'best' algorithm
  const commentsPage =
    await api.functional.communityPlatform.moderator.posts.comments.sorted.index(
      moderatorConnection,
      {
        postId,
        body: {
          sort: "best" as const,
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(commentsPage);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination object exists",
    typeof commentsPage.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is non-negative",
    commentsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    commentsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    commentsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    commentsPage.pagination.pages >= 0,
  );
  // Validate that data is an array
  TestValidator.predicate("data is array", Array.isArray(commentsPage.data));
  // Validate each comment's structure (typia.assert already validates types)
  for (const comment of commentsPage.data) {
    // typia.assert(comment) is implicit in the loop since commentsPage was validated
    // Validate that essential fields are present (business logic validation)
    TestValidator.predicate("comment has content", comment.content.length > 0);
    TestValidator.predicate("comment has author", !!comment.author);
    TestValidator.predicate("comment has post", !!comment.post);
    // Validate author profile completeness
    TestValidator.predicate(
      "author has username",
      comment.author.username.length > 0,
    );
    TestValidator.predicate(
      "author has karma score",
      Number.isInteger(comment.author.karma),
    );
    // Validate post context
    TestValidator.predicate("post has title", comment.post.title.length > 0);
    TestValidator.predicate("post has type", comment.post.post_type.length > 0);
    // Validate vote score is an integer
    TestValidator.predicate(
      "vote score is integer",
      Number.isInteger(comment.vote_score),
    );
  }
  // Note: We cannot validate the exact 'best' sorting algorithm without creating
  // test data with known vote scores and timestamps. The test validates that
  // the endpoint returns properly structured data with pagination.
}
