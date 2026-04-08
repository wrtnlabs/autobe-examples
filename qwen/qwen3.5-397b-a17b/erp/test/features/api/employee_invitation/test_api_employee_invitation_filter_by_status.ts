import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeeInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering employee invitations by status.
 *
 * Validates the employee invitation filtering functionality by status values including pending, accepted, expired, and cancelled. Ensures that the API correctly filters invitations based on status parameter and returns appropriate paginated results.
 *
 * Tests each status filter independently to verify that only matching invitations are returned. Also validates pagination parameters work correctly in combination with status filtering.
 *
 * 1. Member authenticates via registration.
 * 2. Retrieves all invitations without status filter.
 * 3. Filters by 'pending' status and validates response.
 * 4. Filters by 'accepted' status and validates response.
 * 5. Filters by 'expired' status and validates response.
 * 6. Filters by 'cancelled' status and validates response.
 * 7. Tests pagination with status filter combination.
 */
export async function test_api_employee_invitation_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Get all invitations (no filter)
  const allInvitations =
    await api.functional.hrmPlatform.member.employee_invitations.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformEmployeeInvitation.IRequest,
      },
    );
  typia.assert(allInvitations);
  // 3. Filter by 'pending' status
  const pendingInvitations =
    await api.functional.hrmPlatform.member.employee_invitations.index(
      memberConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformEmployeeInvitation.IRequest,
      },
    );
  typia.assert(pendingInvitations);
  // Validate all returned invitations have pending status
  for (const invitation of pendingInvitations.data) {
    TestValidator.equals(
      "pending status matches",
      invitation.status,
      "pending",
    );
  }
  // 4. Filter by 'accepted' status
  const acceptedInvitations =
    await api.functional.hrmPlatform.member.employee_invitations.index(
      memberConnection,
      {
        body: {
          status: "accepted",
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformEmployeeInvitation.IRequest,
      },
    );
  typia.assert(acceptedInvitations);
  // Validate all returned invitations have accepted status
  for (const invitation of acceptedInvitations.data) {
    TestValidator.equals(
      "accepted status matches",
      invitation.status,
      "accepted",
    );
  }
  // 5. Filter by 'expired' status
  const expiredInvitations =
    await api.functional.hrmPlatform.member.employee_invitations.index(
      memberConnection,
      {
        body: {
          status: "expired",
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformEmployeeInvitation.IRequest,
      },
    );
  typia.assert(expiredInvitations);
  // Validate all returned invitations have expired status
  for (const invitation of expiredInvitations.data) {
    TestValidator.equals(
      "expired status matches",
      invitation.status,
      "expired",
    );
  }
  // 6. Filter by 'cancelled' status
  const cancelledInvitations =
    await api.functional.hrmPlatform.member.employee_invitations.index(
      memberConnection,
      {
        body: {
          status: "cancelled",
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformEmployeeInvitation.IRequest,
      },
    );
  typia.assert(cancelledInvitations);
  // Validate all returned invitations have cancelled status
  for (const invitation of cancelledInvitations.data) {
    TestValidator.equals(
      "cancelled status matches",
      invitation.status,
      "cancelled",
    );
  }
  // 7. Test pagination with status filter
  const paginatedPending =
    await api.functional.hrmPlatform.member.employee_invitations.index(
      memberConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformEmployeeInvitation.IRequest,
      },
    );
  typia.assert(paginatedPending);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page valid",
    paginatedPending.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    paginatedPending.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    paginatedPending.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    paginatedPending.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data count matches limit",
    paginatedPending.data.length <= paginatedPending.pagination.limit,
  );
}
