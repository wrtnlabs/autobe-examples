import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";
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
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

/**
 * Test listing subscribers for a community that has no subscribers.
 *
 * Creates a community and verifies that querying its subscriber list returns an empty result with zero records and pages. This validates that the API handles the edge case of an unsubscribed community gracefully rather than returning an error.
 *
 * 1. Register a new member via the join flow.
 * 2. Create a community using the authenticated member connection.
 * 3. Query the subscriber listing endpoint with the community name.
 * 4. Assert the response is an empty page with pagination showing 0 records and 0 pages.
 */
export async function test_api_community_subscribers_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // ---- Step 1: Create a member ----
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // ---- Step 2: Create a community ----
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // ---- Step 3: List subscribers of the community ----
  const subscribers: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.communities.subscribers.index(
      memberConnection,
      {
        communityName: community.name,
        body: {} satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(subscribers);
  // ---- Step 4: Validate empty subscriber list ----
  TestValidator.equals("subscriber count", subscribers.pagination.records, 0);
  TestValidator.equals("page count", subscribers.pagination.pages, 0);
  TestValidator.equals("empty data array", subscribers.data.length, 0);
}
