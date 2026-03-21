import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostLink";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_popular_feed_default_hot_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as member to access the popular feed endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMemberSession.IJoin,
  });
  // Call popular feed with default 'hot' sorting (no sort parameter)
  const popularFeed =
    await api.functional.redditClone.member.posts.popular.index(
      memberConnection,
      {
        body: {} satisfies IRedditClonePostLink.IRequest,
      },
    );
  // Validate response structure with typia.assert
  typia.assert(popularFeed);
  // Validate pagination metadata exists
  TestValidator.equals(
    "pagination exists",
    popularFeed.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "pagination current is valid",
    popularFeed.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    popularFeed.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    popularFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    popularFeed.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.equals(
    "data array exists",
    Array.isArray(popularFeed.data),
    true,
  );
  // Validate each post in the response has required fields
  for (const post of popularFeed.data) {
    typia.assert(post);
    // Validate post has required display fields
    TestValidator.predicate("post has valid id", post.id.length > 0);
    TestValidator.predicate("post has valid title", post.title.length > 0);
    TestValidator.predicate(
      "post has valid type",
      ["text", "link", "image"].includes(post.type),
    );
    // Validate business logic - scores are non-negative
    TestValidator.predicate("vote_score is non-negative", post.vote_score >= 0);
    TestValidator.predicate(
      "comment_count is non-negative",
      post.comment_count >= 0,
    );
    // Validate author information exists
    TestValidator.predicate("author has valid id", post.author.id.length > 0);
    TestValidator.predicate(
      "author has valid username",
      post.author.username.length > 0,
    );
    TestValidator.predicate(
      "author has valid created_at",
      post.author.created_at.length > 0,
    );
    // Validate community information exists
    TestValidator.predicate(
      "community has valid id",
      post.community.id.length > 0,
    );
    TestValidator.predicate(
      "community has valid name",
      post.community.name.length > 0,
    );
    TestValidator.predicate(
      "community has valid description",
      post.community.description.length > 0,
    );
    TestValidator.predicate(
      "community subscriber_count is non-negative",
      post.community.subscriber_count >= 0,
    );
  }
  // Validate pagination relationship
  if (popularFeed.pagination.current === 1) {
    TestValidator.equals(
      "first page data length matches pagination records when no limit exceeded",
      popularFeed.data.length <= popularFeed.pagination.limit,
      true,
    );
  }
}
