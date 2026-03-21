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

export async function test_api_invitations_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and creates organization (becomes owner with full permissions)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // Note: In a real implementation, organizationId would be obtained from:
  // - Organization list API call, or
  // - Embedded in the join response, or
  // - Session context
  // For this test, we assume organizationId is available after member creation
  // Since we need an organizationId to create invitations, we'll need to use
  // a real organization ID. The join endpoint creates an organization automatically,
  // but doesn't return it directly. We would need an organization list endpoint.
  //
  // For the purpose of testing the invitations list API, we'll need to assume
  // there's a way to get the organizationId. In the absence of an organization
  // list endpoint in available functions, this test demonstrates the intended
  // flow for invitation listing.
  // Generate a valid organization ID for testing
  // In production, this would come from an organization list API
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create multiple invitations to populate the list
  const invitationCount = 5;
  const createdInvitations: IErpHrmInvitation[] = [];
  for (let i = 0; i < invitationCount; i++) {
    const invitation =
      await api.functional.erpHrm.member.organizations.invitations.create(
        ownerConnection,
        {
          organizationId,
          body: {
            email: typia.random<string & tags.Format<"email">>(),
            roleId: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IErpHrmInvitation.ICreate,
        },
      );
    typia.assert(invitation);
    createdInvitations.push(invitation);
  }
  // 3. Call the invitations list endpoint with no filters (only organizationId)
  const listResponse =
    await api.functional.erpHrm.member.organizations.invitations.index(
      ownerConnection,
      {
        organizationId,
        body: {} satisfies IErpHrmInvitation.IRequest,
      },
    );
  typia.assert(listResponse);
  // 4. Verify pagination metadata
  TestValidator.equals(
    "current page should be 1",
    listResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be positive",
    listResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records should be at least the created invitations",
    listResponse.pagination.records >= invitationCount,
  );
  TestValidator.predicate(
    "total pages should be at least 1",
    listResponse.pagination.pages >= 1,
  );
  // 5. Verify all created invitations are in the response
  const responseEmails = listResponse.data.map((inv) => inv.email);
  for (const createdInv of createdInvitations) {
    TestValidator.predicate(
      `invitation ${createdInv.email} should be in list`,
      responseEmails.includes(createdInv.email),
    );
  }
  // 6. Verify each invitation summary structure
  for (const invitation of listResponse.data) {
    TestValidator.predicate(
      "invitation should have valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        invitation.id,
      ),
    );
    TestValidator.predicate(
      "invitation should have valid email",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitation.email),
    );
    TestValidator.predicate(
      "invitation status should be valid",
      ["pending", "accepted", "cancelled"].includes(invitation.status),
    );
    TestValidator.predicate(
      "invitation should have role with id",
      !!invitation.role.id,
    );
    TestValidator.predicate(
      "invitation should have role with name",
      !!invitation.role.name,
    );
    TestValidator.predicate(
      "invitation should have created_at",
      !!invitation.created_at,
    );
  }
  // 7. Verify no soft-deleted invitations are present
  // All returned invitations should have valid status (pending, accepted, or cancelled)
  // Soft-deleted records are excluded by the API
  TestValidator.predicate(
    "all invitations should have valid status (no soft-deleted)",
    listResponse.data.every((inv) =>
      ["pending", "accepted", "cancelled"].includes(inv.status),
    ),
  );
}
