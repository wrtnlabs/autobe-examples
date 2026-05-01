import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";

/**
 * Verify that listing subscribers for a community that has no subscriptions
 * returns an empty page with correct pagination metadata.
 *
 * Creates a new community through an authenticated member but intentionally
 * leaves it unsubscribed. Then queries the subscription listing endpoint with
 * default pagination parameters and verifies that the response contains an
 * empty data array and appropriate pagination metadata indicating zero records
 * and zero pages, with the current page defaulting to 1 and the limit
 * reflecting the server default value.
 *
 * 1. Member joins and authenticates via authorize_member_join.
 * 2. Authenticated member creates a new community with a random name and
 *    description. The community is initialized with zero subscribers.
 * 3. The subscription listing endpoint is called for the newly created
 *    community with an empty request body, relying on default pagination.
 * 4. Validates that the response data array is empty and pagination
 *    metadata shows records=0, pages=0, current=1, and a positive limit.
 */
export async function test_api_community_subscriptions_list_empty_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community with zero subscribers
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. List subscriptions for the community (publicly accessible)
  const page =
    await api.functional.communityHub.communities.subscriptions.index(
      connection,
      {
        communityName: community.name,
        body: {},
      },
    );
  typia.assert(page);
  // 4. Validate empty page with correct pagination metadata
  TestValidator.predicate("data array is empty", page.data.length === 0);
  TestValidator.equals("records", page.pagination.records, 0);
  TestValidator.equals("pages", page.pagination.pages, 0);
  TestValidator.equals("current", page.pagination.current, 1);
  TestValidator.predicate("limit is positive", page.pagination.limit > 0);
}
