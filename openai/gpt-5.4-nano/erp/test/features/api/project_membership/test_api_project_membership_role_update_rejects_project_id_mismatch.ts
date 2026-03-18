import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_create";
import { generate_random_erp_hrm_time_tracking_member_projects_memberships_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_memberships_create";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";
import { prepare_random_erp_hrm_time_tracking_project_membership } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project_membership";

export async function test_api_project_membership_role_update_rejects_project_id_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // 1) Authorize member (join)
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    organizationName: RandomGenerator.name(2),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: `https://${RandomGenerator.alphabets(8)}.example.com/join`,
    referrer: `https://${RandomGenerator.alphabets(8)}.example.com/ref`,
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Use the same actor-specific connection that now contains the Authorization header
  const userConnection = memberConnection;
  // 2) Create Project A and Project B
  const projectA =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          color: `#${RandomGenerator.alphabets(6)}`,
          status: RandomGenerator.alphabets(8),
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(projectA);
  const projectB =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          color: `#${RandomGenerator.alphabets(6)}`,
          status: RandomGenerator.alphabets(8),
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(projectB);
  // 3) Create membership under Project A
  const membershipA =
    await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
      userConnection,
      {
        params: { projectId: projectA.id },
        body: {
          employee_id: authorized.id,
          membership_role: RandomGenerator.alphabets(10),
        } satisfies IErpHrmTimeTrackingProjectMembership.ICreate,
      },
    );
  typia.assert(membershipA);
  const originalRole = membershipA.membership_role;
  const targetRole = `${RandomGenerator.alphabets(10)}-role`;
  TestValidator.notEquals(
    "roles should differ for observable update",
    originalRole,
    targetRole,
  );
  // 4) Attempt to update membershipA with mismatched projectId=projectB.id
  await TestValidator.httpError(
    "rejects membership update when projectId path mismatches membership.project_id",
    [400, 401, 403, 404, 409],
    async () => {
      await api.functional.erpHrmTimeTracking.member.projects.memberships.update(
        userConnection,
        {
          projectId: projectB.id,
          membershipId: membershipA.id,
          body: {
            membership_role: targetRole,
          } satisfies IErpHrmTimeTrackingProjectMembership.IUpdate,
        },
      );
    },
  );
  // 5) Verify membership can be updated when scoped correctly
  const updated =
    await api.functional.erpHrmTimeTracking.member.projects.memberships.update(
      userConnection,
      {
        projectId: projectA.id,
        membershipId: membershipA.id,
        body: {
          membership_role: targetRole,
        } satisfies IErpHrmTimeTrackingProjectMembership.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "membership role updated with correct projectId",
    updated.membership_role,
    targetRole,
  );
}
