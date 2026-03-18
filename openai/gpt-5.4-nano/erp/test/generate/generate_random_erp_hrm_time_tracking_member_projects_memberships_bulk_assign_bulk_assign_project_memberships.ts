import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_tracking_project_membership } from "../prepare/prepare_random_erp_hrm_time_tracking_project_membership";

export async function generate_random_erp_hrm_time_tracking_member_projects_memberships_bulk_assign_bulk_assign_project_memberships(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IErpHrmTimeTrackingProjectMembership.ICreate>
      | undefined;
    params: {
      projectId: string;
    };
  },
): Promise<IErpHrmTimeTrackingProjectMembership> {
  const prepared: IErpHrmTimeTrackingProjectMembership.ICreate =
    prepare_random_erp_hrm_time_tracking_project_membership(props.body);
  return await api.functional.erpHrmTimeTracking.member.projects.memberships.bulkAssign.bulkAssignProjectMemberships(
    connection,
    {
      body: prepared,
      projectId: props.params.projectId,
    },
  );
}
