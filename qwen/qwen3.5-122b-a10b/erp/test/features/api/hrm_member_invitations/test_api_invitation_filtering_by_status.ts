import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmEmployeeInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering employee invitations by lifecycle status.
 *
 * Validates the invitation filtering functionality by status (pending, accepted, expired, cancelled) for members with employee:manage permission. Tests that filtering returns only matching invitations and that pagination metadata reflects the filtered result count.
 *
 * The test verifies that each status filter returns the correct subset of invitations and that combining filters works correctly. It also validates pagination behavior with different filter combinations.
 *
 * 1. Authenticate as member with email/password credentials.
 * 2. Get all invitations without filter to see existing data.
 * 3. Test filtering by "pending" status - verify only pending invitations returned.
 * 4. Test filtering by "accepted" status - verify only accepted invitations returned.
 * 5. Test filtering by "expired" status - verify only expired invitations returned.
 * 6. Test filtering by "cancelled" status - verify only cancelled invitations returned.
 * 7. Verify pagination metadata reflects filtered count, not total count.
 * 8. Test combining status filter with email partial match filter.
 * 9. Test pagination with limit constraint.
 */
export async function test_api_invitation_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Get all invitations without filter
  const allInvitations = await api.functional.hrm.member.invitations.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmEmployeeInvitation.IRequest,
    },
  );
  typia.assert(allInvitations);
  // 3-6. Test filtering by each status
  const statuses: Array<"pending" | "accepted" | "expired" | "cancelled"> = [
    "pending",
    "accepted",
    "expired",
    "cancelled",
  ];
  for (const status of statuses) {
    const filtered = await api.functional.hrm.member.invitations.index(
      memberConnection,
      {
        body: {
          status,
          page: 1,
          limit: 100,
        } satisfies IHrmEmployeeInvitation.IRequest,
      },
    );
    typia.assert(filtered);
    // Verify all returned invitations have the correct status
    for (const invitation of filtered.data) {
      TestValidator.equals(
        `invitation status matches filter "${status}"`,
        invitation.status,
        status,
      );
    }
    // Verify pagination reflects filtered count
    TestValidator.equals(
      `pagination records for status "${status}"`,
      filtered.pagination.records,
      filtered.data.length,
    );
  }
  // 7. Test combining status filter with email filter
  if (allInvitations.data.length > 0) {
    const sampleEmail = allInvitations.data[0].email;
    const emailPrefix = sampleEmail.substring(
      0,
      Math.max(1, sampleEmail.length - 5),
    );
    const combinedFilter = await api.functional.hrm.member.invitations.index(
      memberConnection,
      {
        body: {
          status: "pending",
          email: emailPrefix,
          page: 1,
          limit: 100,
        } satisfies IHrmEmployeeInvitation.IRequest,
      },
    );
    typia.assert(combinedFilter);
    // Verify all results match both filters
    for (const invitation of combinedFilter.data) {
      TestValidator.equals(
        "combined filter - status matches",
        invitation.status,
        "pending",
      );
      TestValidator.predicate(
        "combined filter - email contains prefix",
        invitation.email.includes(emailPrefix),
      );
    }
  }
  // 8. Test pagination with limit
  const paginated = await api.functional.hrm.member.invitations.index(
    memberConnection,
    {
      body: {
        status: "pending",
        page: 1,
        limit: 10,
      } satisfies IHrmEmployeeInvitation.IRequest,
    },
  );
  typia.assert(paginated);
  TestValidator.predicate(
    "pagination limit respected",
    paginated.data.length <= paginated.pagination.limit,
  );
  TestValidator.equals(
    "pagination current page",
    paginated.pagination.current,
    1,
  );
}
