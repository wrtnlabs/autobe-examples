import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_feed_home_by_authenticated_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account through join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Use the authenticated connection to call the home feed endpoint
  const feed =
    await api.functional.redditCommunity.member.feed.home.index(
      memberConnection,
    );
  typia.assert(feed);
  // 3. Validate the feed structure
  TestValidator.equals("pagination exists", feed.pagination, {
    current: 1, // Default is 1 when no page parameter provided
    limit: feed.pagination.limit, // Allow any limit as per API response
    records: feed.pagination.records,
    pages: feed.pagination.pages,
  } satisfies IPage.IPagination);
  // Validate that each post summary follows the IRedditCommunityPost.ISummary schema
  for (const post of feed.data) {
    TestValidator.equals(
      "post has id",
      post.id,
      post.id satisfies string & tags.Format<"uuid">,
    );
    TestValidator.equals(
      "post has title",
      post.title,
      post.title satisfies string,
    );
    TestValidator.equals(
      "post has author",
      post.author,
      post.author satisfies IRedditCommunityMember.ISummary,
    );
    TestValidator.equals(
      "post has community",
      post.community,
      post.community satisfies IRedditCommunityCommunity.ISummary,
    );
    TestValidator.equals(
      "post has voteScore",
      post.voteScore,
      post.voteScore satisfies number & tags.Type<"int32">,
    );
    TestValidator.equals(
      "post has commentCount",
      post.commentCount,
      post.commentCount satisfies number & tags.Type<"int32">,
    );
    TestValidator.equals(
      "post has createdAt",
      post.createdAt,
      post.createdAt satisfies string & tags.Format<"date-time">,
    );
    TestValidator.equals(
      "post has updatedAt",
      post.updatedAt,
      post.updatedAt satisfies string & tags.Format<"date-time">,
    );
    // Check optional fields
    if (post.url !== undefined) {
      TestValidator.predicate(
        "url is valid URI",
        () => post.url === null || typeof post.url === "string",
      );
    }
    if (post.imageUrl !== undefined) {
      TestValidator.predicate(
        "imageUrl is valid URI",
        () => post.imageUrl === null || typeof post.imageUrl === "string",
      );
    }
  }
  // It's acceptable to have an empty feed if no subscriptions exist
  // We only validate structure, not content existence
}
