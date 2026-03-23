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
 * Test filtering employee invitations by status to verify status-based query functionality.
 *
 * This test validates that the PATCH /hrmPlatform/admin/invitations endpoint correctly
 * filters invitations based on their status (pending, accepted, expired, revoked).
 * The test authenticates as admin, queries invitations with different status filters,
 * and verifies that only matching invitations are returned in each query.
 */
export async function test_api_employee_invitation_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Test filtering with status='pending'
  const pendingResult =
    await api.functional.hrmPlatform.admin.invitations.index(adminConnection, {
      body: {
        status: "pending",
      } satisfies IHrmPlatformEmployeeInvitation.IRequest,
    });
  typia.assert(pendingResult);
  // Verify all returned invitations have 'pending' status
  for (const invitation of pendingResult.data) {
    TestValidator.equals(
      `invitation ${invitation.id} has pending status`,
      invitation.status,
      "pending",
    );
    // Pending invitations should have null redeemedByMember and redeemed_at
    TestValidator.equals(
      `pending invitation ${invitation.id} has null redeemedByMember`,
      invitation.redeemedByMember,
      null,
    );
    TestValidator.equals(
      `pending invitation ${invitation.id} has null redeemed_at`,
      invitation.redeemed_at,
      null,
    );
  }
  // 3. Test filtering with status='accepted'
  const acceptedResult =
    await api.functional.hrmPlatform.admin.invitations.index(adminConnection, {
      body: {
        status: "accepted",
      } satisfies IHrmPlatformEmployeeInvitation.IRequest,
    });
  typia.assert(acceptedResult);
  // Verify all returned invitations have 'accepted' status
  for (const invitation of acceptedResult.data) {
    TestValidator.equals(
      `invitation ${invitation.id} has accepted status`,
      invitation.status,
      "accepted",
    );
    // Accepted invitations should have redeemedByMember and redeemed_at
    TestValidator.predicate(
      `accepted invitation ${invitation.id} has redeemedByMember`,
      invitation.redeemedByMember !== null,
    );
    TestValidator.predicate(
      `accepted invitation ${invitation.id} has redeemed_at`,
      invitation.redeemed_at !== null,
    );
  }
  // 4. Test filtering with status='expired'
  const expiredResult =
    await api.functional.hrmPlatform.admin.invitations.index(adminConnection, {
      body: {
        status: "expired",
      } satisfies IHrmPlatformEmployeeInvitation.IRequest,
    });
  typia.assert(expiredResult);
  // Verify all returned invitations have 'expired' status
  for (const invitation of expiredResult.data) {
    TestValidator.equals(
      `invitation ${invitation.id} has expired status`,
      invitation.status,
      "expired",
    );
  }
  // 5. Test filtering with status='revoked'
  const revokedResult =
    await api.functional.hrmPlatform.admin.invitations.index(adminConnection, {
      body: {
        status: "revoked",
      } satisfies IHrmPlatformEmployeeInvitation.IRequest,
    });
  typia.assert(revokedResult);
  // Verify all returned invitations have 'revoked' status
  for (const invitation of revokedResult.data) {
    TestValidator.equals(
      `invitation ${invitation.id} has revoked status`,
      invitation.status,
      "revoked",
    );
  }
  // 6. Test with no status filter (should return all invitations)
  const allResult = await api.functional.hrmPlatform.admin.invitations.index(
    adminConnection,
    {
      body: {} satisfies IHrmPlatformEmployeeInvitation.IRequest,
    },
  );
  typia.assert(allResult);
  // Verify total count equals sum of all filtered results
  const totalFiltered =
    pendingResult.data.length +
    acceptedResult.data.length +
    expiredResult.data.length +
    revokedResult.data.length;
  TestValidator.equals(
    "total invitations matches sum of filtered results",
    allResult.data.length,
    totalFiltered,
  );
  // Verify pagination metadata is correct
  TestValidator.predicate(
    "pagination records match data length",
    allResult.pagination.records === allResult.data.length,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    allResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    allResult.pagination.limit > 0,
  );
}
