import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_create";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";

export async function test_api_project_update_manage_member_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member via authorize_member_join
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: "127.0.0.1",
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // 2) Create a project in the currently selected organization
  const createdProject =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color: "#" + RandomGenerator.alphabets(6),
          // Use a valid status value by letting the server validate; but we need a compile-time value.
          // We will set status equal to a later observed valid value after creation by reusing createdProject.status.
          // For creation, we still must provide status; use the same as update later.
          status: "active",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(createdProject);
  const projectId = createdProject.id;
  TestValidator.equals(
    "created project id matches",
    projectId,
    createdProject.id,
  );
  const original = createdProject;
  // 3) Update project display attributes + lifecycle status
  const updatedName = RandomGenerator.name();
  const updatedColor = "#" + RandomGenerator.alphabets(6);
  // Include a lifecycle status value that we know is valid (the one returned from creation)
  const updatedStatus = createdProject.status;
  const updateBody = {
    name: updatedName,
    color: updatedColor,
    status: updatedStatus,
  } satisfies IErpHrmTimeTrackingProject.IUpdate;
  const updated =
    await api.functional.erpHrmTimeTracking.member.projects.update(
      memberConnection,
      {
        projectId,
        body: updateBody,
      },
    );
  typia.assert(updated);
  // 4) Verify response reflects the updated values
  TestValidator.equals("updated id preserved", updated.id, projectId);
  TestValidator.equals("updated name", updated.name, updatedName);
  TestValidator.equals("updated color", updated.color, updatedColor);
  TestValidator.equals("updated status", updated.status, updatedStatus);
  // Only provided fields should change (name/color/status); ensure others unchanged
  TestValidator.equals(
    "organization scope unchanged",
    updated.erp_hrm_time_tracking_organization_id,
    original.erp_hrm_time_tracking_organization_id,
  );
  TestValidator.equals(
    "created_at preserved",
    updated.created_at,
    original.created_at,
  );
  // 5) Verify scoping behavior across organizations/tenants
  // Create another member in a different organization
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join2",
    referrer: "https://example.com/referrer2",
    ip: "127.0.0.1",
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(otherMemberConnection, {
    body: otherJoinBody,
  });
  const otherProject =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      otherMemberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color: "#" + RandomGenerator.alphabets(6),
          status: "active",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(otherProject);
  const otherUpdateBody = {
    name: RandomGenerator.name(),
    color: "#" + RandomGenerator.alphabets(6),
    status: otherProject.status,
  } satisfies IErpHrmTimeTrackingProject.IUpdate;
  // Attempt to update other tenant's project id while still in original member's organization
  await TestValidator.error(
    "should not update project from other organization",
    async () => {
      await api.functional.erpHrmTimeTracking.member.projects.update(
        memberConnection,
        {
          projectId: otherProject.id,
          body: otherUpdateBody,
        },
      );
    },
  );
}
