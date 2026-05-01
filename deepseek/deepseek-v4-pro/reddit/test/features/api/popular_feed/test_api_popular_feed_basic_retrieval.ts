import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Verify that the popular feed is publicly accessible without authentication
 * and returns properly structured paginated data.
 *
 * Validates that the platform-wide popular feed endpoint returns a 200 response
 * with the correct IPageICommunityHubPost.ISummary structure — including
 * pagination metadata (current, limit, records, pages) and a data array of post
 * summaries with all required fields. Confirms that unauthenticated guests can
 * access platform-wide content without any authorization token.
 *
 * 1. A new member joins, creates a community, and publishes a text post within it.
 * 2. The popular feed is called using a base connection with no auth headers.
 * 3. The response structure is validated via typia.assert for complete type safety.
 * 4. Business logic checks confirm the feed contains at least one post and
 *    pagination metadata is internally consistent.
 */
export async function test_api_popular_feed_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member who will own the community and post
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community under the authenticated member
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Create a text post in the community so the popular feed has content
  await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      params: { communityName: community.name },
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  // 4. Call popular feed without authentication (no auth on base connection)
  const feed = await api.functional.communityHub.feed.popular(connection);
  typia.assert(feed);
  // 5. Validate business logic — feed should contain at least one post
  TestValidator.predicate(
    "popular feed contains at least one post",
    feed.data.length > 0,
  );
  TestValidator.predicate(
    "pagination records count is positive",
    feed.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages count is positive",
    feed.pagination.pages > 0,
  );
}
