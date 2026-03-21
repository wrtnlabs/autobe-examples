import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_invitations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_invitations_create";
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";

export async function test_api_invitations_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member connection (authorizes and creates first organization)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // Step 2: Generate organizationId for testing
  // Note: In real scenario, organizationId would be obtained from member's organization list
  // Since there's no organizations.index endpoint available, we use a random UUID for testing
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create multiple pending invitations
  const pendingInvitations = await ArrayUtil.asyncRepeat(3, async () => {
    return await generate_random_erp_hrm_member_organizations_invitations_create(
      memberConnection,
      {
        params: { organizationId },
      },
    );
  });
  // Verify all created invitations have 'pending' status
  for (const invitation of pendingInvitations) {
    typia.assert(invitation);
    TestValidator.equals(
      "initial status is pending",
      invitation.status,
      "pending",
    );
  }
  // Step 4: Test filtering by status='pending'
  const pendingResult =
    await api.functional.erpHrm.member.organizations.invitations.index(
      memberConnection,
      {
        organizationId,
        body: { status: "pending" },
      },
    );
  typia.assert(pendingResult);
  // Validate pagination for pending filter
  TestValidator.predicate(
    "pagination current >= 1",
    pendingResult.pagination.current >= 1,
  );
  TestValidator.equals(
    "pending count matches records",
    pendingResult.data.length,
    pendingResult.pagination.records,
  );
  // Validate all returned invitations have status='pending'
  TestValidator.predicate(
    "all pending invitations have correct status",
    pendingResult.data.every((inv) => inv.status === "pending"),
  );
  // Validate our created invitations are in the result
  const pendingEmails = new Set(pendingInvitations.map((i) => i.email));
  const foundPending = pendingResult.data.filter((inv) =>
    pendingEmails.has(inv.email),
  );
  TestValidator.predicate(
    "created invitations found in pending results",
    foundPending.length >= 3,
  );
  // Step 5: Test filtering by status='accepted'
  const acceptedResult =
    await api.functional.erpHrm.member.organizations.invitations.index(
      memberConnection,
      {
        organizationId,
        body: { status: "accepted" },
      },
    );
  typia.assert(acceptedResult);
  // Validate pagination for accepted filter
  TestValidator.predicate(
    "accepted pagination current >= 1",
    acceptedResult.pagination.current >= 1,
  );
  TestValidator.equals(
    "accepted data length matches records",
    acceptedResult.data.length,
    acceptedResult.pagination.records,
  );
  // Validate all returned invitations have status='accepted'
  TestValidator.predicate(
    "all accepted invitations have correct status",
    acceptedResult.data.every((inv) => inv.status === "accepted"),
  );
  // Step 6: Test filtering by status='cancelled'
  const cancelledResult =
    await api.functional.erpHrm.member.organizations.invitations.index(
      memberConnection,
      {
        organizationId,
        body: { status: "cancelled" },
      },
    );
  typia.assert(cancelledResult);
  // Validate pagination for cancelled filter
  TestValidator.predicate(
    "cancelled pagination current >= 1",
    cancelledResult.pagination.current >= 1,
  );
  TestValidator.equals(
    "cancelled data length matches records",
    cancelledResult.data.length,
    cancelledResult.pagination.records,
  );
  // Validate all returned invitations have status='cancelled'
  TestValidator.predicate(
    "all cancelled invitations have correct status",
    cancelledResult.data.every((inv) => inv.status === "cancelled"),
  );
  // Step 7: Test with no status filter (returns all invitations)
  const allResult =
    await api.functional.erpHrm.member.organizations.invitations.index(
      memberConnection,
      {
        organizationId,
        body: {},
      },
    );
  typia.assert(allResult);
  // Validate pagination for all invitations
  TestValidator.predicate(
    "all pagination current >= 1",
    allResult.pagination.current >= 1,
  );
  TestValidator.equals(
    "all data length matches records",
    allResult.data.length,
    allResult.pagination.records,
  );
  // Validate pending invitations are in the total result
  const allEmails = new Set(allResult.data.map((inv) => inv.email));
  TestValidator.predicate(
    "created invitations found in total results",
    pendingInvitations.every((inv) => allEmails.has(inv.email)),
  );
  // Step 8: Test pagination limit parameter
  const limitedResult =
    await api.functional.erpHrm.member.organizations.invitations.index(
      memberConnection,
      {
        organizationId,
        body: { status: "pending", limit: 1 },
      },
    );
  typia.assert(limitedResult);
  TestValidator.equals(
    "limit parameter respected",
    limitedResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "limited data length <= limit",
    limitedResult.data.length <= 1,
  );
}
