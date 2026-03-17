import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformSubscriptionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionPreference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSubscriptionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscriptionPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the basic retrieval of subscription preferences for an authenticated member.
 * 1. Create a member account through join
 * 2. Test the search endpoint with minimal filters to retrieve all preferences
 * 3. Verify that only the authenticated member's preferences are returned with proper pagination metadata
 * 4. Validate response structure matches expected schema with proper pagination information
 */
export async function test_api_subscription_preference_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup with join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Note: The test cannot create communities or subscriptions because
  // there are no available SDK functions for creating communities or
  // subscriptions in the provided API functions list. The search endpoint
  // will return whatever preferences exist for the authenticated member.
  // This tests the basic functionality of the search endpoint with minimal
  // filters, verifying the response structure and that only the authenticated
  // member's preferences are returned.
  // 2. Search subscription preferences with minimal filters
  const searchRequest = {
    page: 1 satisfies number as number,
    limit: 20 satisfies number as number,
    sort: "created_at,desc" satisfies string as string,
  } satisfies ICommunityPlatformSubscriptionPreference.IRequest;
  const response =
    await api.functional.communityPlatform.member.subscription_preferences.index(
      memberConnection,
      {
        body: searchRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata (business logic, not type validation)
  TestValidator.predicate(
    "page should be at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit should be positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages calculation should be correct",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit) ||
      response.pagination.records === 0,
  );
  // 4. Validate that each preference belongs to the authenticated member
  // (business logic validation, not type validation)
  for (const preference of response.data) {
    TestValidator.equals(
      "subscription member should be authenticated member",
      preference.subscription.member.id,
      member.id,
    );
    TestValidator.predicate(
      "subscription should be active",
      preference.subscription.active === true,
    );
  }
}
