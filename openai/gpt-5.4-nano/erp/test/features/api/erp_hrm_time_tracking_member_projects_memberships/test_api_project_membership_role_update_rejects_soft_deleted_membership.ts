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

export async function test_api_project_membership_role_update_rejects_soft_deleted_membership(
  connection: api.IConnection,
): Promise<void> {
  // 1) Sign up a member account (join)
  // 2) Create a project
  // 3) Create a project membership (capture membership id)
  // 4) Soft-delete the membership
  // 5) Attempt updating membership_role on soft-deleted membership -> must be rejected
  // 6) Ensure role remains unchanged
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 6,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const project =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  const roleBefore = typia.random<string & tags.MinLength<1>>();
  const membershipCreate: IErpHrmTimeTrackingProjectMembership.ICreate =
    prepare_random_erp_hrm_time_tracking_project_membership({
      membership_role: roleBefore,
    });
  const membership =
    await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: membershipCreate,
      },
    );
  typia.assert(membership);
  await api.functional.erpHrmTimeTracking.member.projects.memberships.erase(
    memberConnection,
    {
      projectId: project.id,
      membershipId: membership.id,
    },
  );
  const membershipRoleAttempt = typia.random<string & tags.MinLength<1>>();
  await TestValidator.error(
    "should reject updating a soft-deleted membership",
    async () => {
      await api.functional.erpHrmTimeTracking.member.projects.memberships.update(
        memberConnection,
        {
          projectId: project.id,
          membershipId: membership.id,
          body: {
            membership_role: membershipRoleAttempt,
          } satisfies IErpHrmTimeTrackingProjectMembership.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "pre-deletion membership role matches input",
    membership.membership_role,
    roleBefore,
  );
}
