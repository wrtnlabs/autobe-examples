import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that viewing subscribed communities returns an empty page for a member with no subscriptions.
 *
 * Validates the edge case where an authenticated member with zero active subscriptions requests their subscribed communities list. The system must return a valid paginated response with an empty data array and correct pagination metadata (current=1, records=0, pages=0) rather than throwing an error.
 *
 * Per business rules:
 * - Section 198: The system SHALL not return an error and SHALL return an empty list
 * - Section 128: When a member who has no subscriptions requests to view their subscribed communities, the system SHALL return an empty list
 *
 * 1. Register a new member via authorize_member_join (creates account + obtains JWT tokens)
 * 2. Call the subscribed communities list endpoint with default pagination
 * 3. Validate the response is a valid paginated structure with empty data
 */
export async function test_api_subscribed_communities_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (do NOT subscribe to any community)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Call the subscribed communities list endpoint with default pagination
  const page: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.member.subscriptions.communities.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(page);
  // 3. Validate pagination metadata
  TestValidator.equals("pagination.current", page.pagination.current, 1);
  TestValidator.equals("pagination.records", page.pagination.records, 0);
  TestValidator.equals("pagination.pages", page.pagination.pages, 0);
  // 4. Validate data array is empty
  TestValidator.equals("data.length", page.data.length, 0);
}