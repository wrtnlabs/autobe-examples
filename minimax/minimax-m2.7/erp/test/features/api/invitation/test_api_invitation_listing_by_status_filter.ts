import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
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

export async function test_api_invitation_listing_by_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. List invitations with status filter (default sort is created_at desc)
  // Note: Using member.id as organizationId for the test context
  const invitationsResponse =
    await api.functional.erpHrm.member.erpHrm.organizations.invitations.index(
      memberConnection,
      {
        organizationId: member.id,
        body: {
          status: "pending",
        } satisfies IErpHrmInvitation.IRequest,
      },
    );
  typia.assert(invitationsResponse);
  // 3. Validate response structure has pagination
  TestValidator.equals(
    "response has pagination",
    invitationsResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(invitationsResponse.data),
    true,
  );
  TestValidator.predicate("pagination has required fields", () => {
    return (
      typeof invitationsResponse.pagination.current === "number" &&
      typeof invitationsResponse.pagination.limit === "number" &&
      typeof invitationsResponse.pagination.records === "number" &&
      typeof invitationsResponse.pagination.pages === "number"
    );
  });
  // 4. If there are invitations, validate their structure
  if (invitationsResponse.data.length > 0) {
    const invitation = invitationsResponse.data[0];
    TestValidator.equals("has id", typeof invitation.id === "string", true);
    TestValidator.equals(
      "has email",
      typeof invitation.email === "string",
      true,
    );
    TestValidator.equals(
      "has status",
      typeof invitation.status === "string",
      true,
    );
    TestValidator.equals(
      "has created_at",
      typeof invitation.created_at === "string",
      true,
    );
    TestValidator.equals("has role", invitation.role !== undefined, true);
  }
}
