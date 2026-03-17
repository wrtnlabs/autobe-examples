import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test the basic functionality of community feed access as an unauthenticated guest.
 * 1. Create a member and authenticate
 * 2. Create a community
 * 3. Retrieve community feed as guest (no authentication)
 * 4. Validate paginated response structure with post summaries
 */
export async function test_api_community_feed_guest_access_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community using member connection (UTILITY FUNCTION)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Retrieve community feed as guest (unauthenticated)
  // Use base connection without authentication headers
  const feedResponse =
    await api.functional.communityPlatform.communities.feeds.index(
      connection, // base connection (guest)
      {
        communityId: community.id,
        body: {
          sort: "hot",
          page: 1 satisfies number as number,
          limit: 20 satisfies number as number,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(feedResponse);
  // 4. Validate business logic (NOT type validation)
  // typia.assert already validated all types completely
  // Validate pagination structure matches created community
  TestValidator.predicate(
    "pagination current page is 1",
    feedResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 20",
    feedResponse.pagination.limit === 20,
  );
  TestValidator.predicate(
    "records count is non-negative",
    feedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    feedResponse.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate("data is an array", Array.isArray(feedResponse.data));
  // If there are posts, validate community matches
  if (feedResponse.data.length > 0) {
    const post = feedResponse.data[0];
    TestValidator.equals(
      "post community matches created community",
      post.community.id,
      community.id,
    );
  }
  // Validate total records consistency
  TestValidator.predicate(
    "data length <= limit",
    feedResponse.data.length <= feedResponse.pagination.limit,
  );
  // Validate community feed accessible without auth (implicitly tested by using base connection)
}
