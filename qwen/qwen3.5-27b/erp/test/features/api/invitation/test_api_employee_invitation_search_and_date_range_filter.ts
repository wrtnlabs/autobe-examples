import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeeInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test comprehensive search and date range filtering capabilities for employee invitations.
 *
 * This test validates the PATCH /hrmPlatform/admin/invitations endpoint's filtering
 * functionality including email search, date range filters (created_at, expires_at,
 * redeemed_at), status filtering, and combined filter scenarios.
 */
export async function test_api_employee_invitation_search_and_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.hrmPlatform.auth.admin.join(adminConnection, {
    body: {
      email: "test_admin@example.com",
      password: "securePassword123",
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin",
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Test email search functionality
  const searchResult = await api.functional.hrmPlatform.admin.invitations.index(
    adminConnection,
    {
      body: {
        search: "john",
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployeeInvitation.IRequest,
    },
  );
  typia.assert(searchResult);
  // Verify all returned invitations contain the search term in email
  for (const invitation of searchResult.data) {
    TestValidator.predicate(
      `email contains search term 'john'`,
      invitation.email.toLowerCase().includes("john"),
    );
  }
  // 3. Test created_at date range filter
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const createdAtRangeResult =
    await api.functional.hrmPlatform.admin.invitations.index(adminConnection, {
      body: {
        created_at_gte: twoDaysAgo.toISOString(),
        created_at_lte: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployeeInvitation.IRequest,
    });
  typia.assert(createdAtRangeResult);
  // Verify all invitations are within the created_at range
  for (const invitation of createdAtRangeResult.data) {
    const createdAt = new Date(invitation.created_at);
    TestValidator.predicate(
      `created_at >= ${twoDaysAgo.toISOString()}`,
      createdAt >= twoDaysAgo,
    );
    TestValidator.predicate(
      `created_at <= ${now.toISOString()}`,
      createdAt <= now,
    );
  }
  // 4. Test expires_at date range filter
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiresAtRangeResult =
    await api.functional.hrmPlatform.admin.invitations.index(adminConnection, {
      body: {
        expires_at_gte: now.toISOString(),
        expires_at_lte: nextWeek.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployeeInvitation.IRequest,
    });
  typia.assert(expiresAtRangeResult);
  // Verify all invitations have expires_at within range
  for (const invitation of expiresAtRangeResult.data) {
    const expiresAt = new Date(invitation.expires_at);
    TestValidator.predicate(
      `expires_at >= ${now.toISOString()}`,
      expiresAt >= now,
    );
    TestValidator.predicate(
      `expires_at <= ${nextWeek.toISOString()}`,
      expiresAt <= nextWeek,
    );
  }
  // 5. Test redeemed_at date range filter (only for accepted invitations)
  const redeemedAtRangeResult =
    await api.functional.hrmPlatform.admin.invitations.index(adminConnection, {
      body: {
        redeemed_at_gte: twoDaysAgo.toISOString(),
        redeemed_at_lte: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployeeInvitation.IRequest,
    });
  typia.assert(redeemedAtRangeResult);
  // Verify all returned invitations have redeemed_at within range and are accepted
  for (const invitation of redeemedAtRangeResult.data) {
    TestValidator.predicate(
      `invitation status is 'accepted'`,
      invitation.status === "accepted",
    );
    TestValidator.predicate(
      `redeemed_at is not null`,
      invitation.redeemed_at !== null,
    );
    if (invitation.redeemed_at !== null) {
      const redeemedAt = new Date(invitation.redeemed_at);
      TestValidator.predicate(
        `redeemed_at >= ${twoDaysAgo.toISOString()}`,
        redeemedAt >= twoDaysAgo,
      );
      TestValidator.predicate(
        `redeemed_at <= ${now.toISOString()}`,
        redeemedAt <= now,
      );
    }
  }
  // 6. Test combined filters: status + email search + date range
  const combinedFilterResult =
    await api.functional.hrmPlatform.admin.invitations.index(adminConnection, {
      body: {
        status: "pending",
        search: "test",
        created_at_gte: oneDayAgo.toISOString(),
        created_at_lte: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployeeInvitation.IRequest,
    });
  typia.assert(combinedFilterResult);
  // Verify all results satisfy all filter criteria
  for (const invitation of combinedFilterResult.data) {
    // Check status
    TestValidator.equals(
      "invitation status is 'pending'",
      invitation.status,
      "pending",
    );
    // Check email contains search term
    TestValidator.predicate(
      `email contains search term 'test'`,
      invitation.email.toLowerCase().includes("test"),
    );
    // Check created_at range
    const createdAt = new Date(invitation.created_at);
    TestValidator.predicate(
      `created_at >= ${oneDayAgo.toISOString()}`,
      createdAt >= oneDayAgo,
    );
    TestValidator.predicate(
      `created_at <= ${now.toISOString()}`,
      createdAt <= now,
    );
  }
  // 7. Test empty results scenario (filter that should return no results)
  const emptyResult = await api.functional.hrmPlatform.admin.invitations.index(
    adminConnection,
    {
      body: {
        search: "nonexistent_user_xyz123",
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployeeInvitation.IRequest,
    },
  );
  typia.assert(emptyResult);
  // Verify pagination shows zero results
  TestValidator.equals(
    "empty search returns zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns empty data array",
    emptyResult.data.length,
    0,
  );
  // 8. Test pagination metadata accuracy
  const paginationResult =
    await api.functional.hrmPlatform.admin.invitations.index(adminConnection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IHrmPlatformEmployeeInvitation.IRequest,
    });
  typia.assert(paginationResult);
  // Verify pagination metadata
  TestValidator.equals(
    "current page is 1",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals("limit is 5", paginationResult.pagination.limit, 5);
  TestValidator.predicate(
    "data length does not exceed limit",
    paginationResult.data.length <= 5,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    paginationResult.pagination.pages ===
      Math.ceil(
        paginationResult.pagination.records / paginationResult.pagination.limit,
      ),
  );
}
