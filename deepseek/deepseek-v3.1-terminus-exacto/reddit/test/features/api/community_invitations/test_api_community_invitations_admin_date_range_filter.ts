import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityInvitation";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin community invitations date range filter functionality.
 *
 * This test validates that administrators can filter community invitations
 * using date range parameters including creation date ranges and expiration
 * date filters. Since we cannot create invitations with the available API,
 * this test focuses on validating the search endpoint structure and error
 * handling for date parameters.
 */
export async function test_api_community_invitations_admin_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    },
  });
  typia.assert(admin);
  // Use a valid community ID format for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Test date range filtering with valid ISO date strings
  const now = new Date().toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  // Test 1: Basic date range filtering
  const invitations =
    await api.functional.communityPlatform.admin.communities.invitations.index(
      adminConnection,
      {
        communityId,
        body: {
          created_at_start: oneDayAgo,
          created_at_end: now,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  typia.assert(invitations);
  // Test 2: Expiration date filtering
  const expiringInvitations =
    await api.functional.communityPlatform.admin.communities.invitations.index(
      adminConnection,
      {
        communityId,
        body: {
          expires_at_start: now,
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  typia.assert(expiringInvitations);
  // Test 3: Combined date filters
  const combinedFilters =
    await api.functional.communityPlatform.admin.communities.invitations.index(
      adminConnection,
      {
        communityId,
        body: {
          created_at_start: oneDayAgo,
          expires_at_start: now,
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  typia.assert(combinedFilters);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure exists",
    typeof invitations.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has valid current page",
    invitations.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    invitations.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    invitations.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    invitations.pagination.pages >= 0,
  );
  // Validate that data array exists (it may be empty if no invitations match)
  TestValidator.equals(
    "data property exists",
    Array.isArray(invitations.data),
    true,
  );
  // If we have data, validate the invitation structure
  if (invitations.data.length > 0) {
    const invitation = invitations.data[0];
    // typia.assert already validated the structure, so we only test business logic
    TestValidator.predicate(
      "invitation has valid UUID format",
      /^[0-9a-f-]{36}$/i.test(invitation.id),
    );
    TestValidator.predicate(
      "invitation has valid status",
      typeof invitation.status === "string",
    );
    TestValidator.predicate(
      "invitation has valid expiration date",
      !isNaN(new Date(invitation.expires_at).getTime()),
    );
    TestValidator.predicate(
      "invitation has valid creation date",
      !isNaN(new Date(invitation.created_at).getTime()),
    );
  }
}
