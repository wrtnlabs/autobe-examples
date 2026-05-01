import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
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

/**
 * Test filtering the invitation list by status "pending" and validate pagination metadata.
 *
 * Authenticates a new member and queries the invitation listing endpoint twice: first without any filter to obtain the complete invitation dataset, then with the status filter set to "pending". Validates that every invitation in the filtered response carries exactly the "pending" status and that no invitations with "fulfilled" or "revoked" status leak into the filtered results.
 *
 * The test also verifies that the pagination metadata correctly reflects the filtered subset. It manually counts how many pending invitations exist in the unfiltered dataset and asserts that the filtered response's `pagination.records` matches this manual count, confirming that pagination aggregates over the filtered scope rather than the total dataset.
 *
 * 1. Member joins and authenticates via authorize_member_join.
 * 2. Retrieve all invitations without a status filter to capture the full dataset.
 * 3. Retrieve invitations filtered by status "pending".
 * 4. Assert every invitation in the filtered response has status "pending".
 * 5. Assert no non-pending invitation appears in the filtered response.
 * 6. Manually count pending invitations from the unfiltered dataset.
 * 7. Verify pagination.records in the filtered response equals the manual pending count.
 */
export async function test_api_invitation_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Retrieve all invitations without status filter
  const allResponse = await api.functional.erpHrm.member.invitations.index(
    memberConnection,
    { body: {} satisfies IErpHrmInvitation.IRequest },
  );
  typia.assert(allResponse);
  // 3. Retrieve invitations filtered by pending status
  const pendingResponse = await api.functional.erpHrm.member.invitations.index(
    memberConnection,
    { body: { status: "pending" } satisfies IErpHrmInvitation.IRequest },
  );
  typia.assert(pendingResponse);
  // 4. Every invitation in the filtered response must have status "pending"
  for (const invitation of pendingResponse.data) {
    TestValidator.equals(
      "filtered invitation status is pending",
      invitation.status,
      "pending",
    );
  }
  // 5. No invitation with status other than "pending" appears in filtered results
  const hasNonPending = pendingResponse.data.some(
    (inv) => inv.status !== "pending",
  );
  TestValidator.predicate(
    "no non-pending invitations in filtered results",
    !hasNonPending,
  );
  // 6. Pagination records reflects filtered count, not total count
  const pendingCountFromAll = allResponse.data.filter(
    (inv) => inv.status === "pending",
  ).length;
  TestValidator.equals(
    "pagination records matches manually counted pending invitations",
    pendingResponse.pagination.records,
    pendingCountFromAll,
  );
  // 7. Filtered records must be a subset of total records
  TestValidator.predicate(
    "pending records <= total records",
    pendingResponse.pagination.records <= allResponse.pagination.records,
  );
}
