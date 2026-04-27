import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_role_permission } from "../prepare/prepare_random_hrm_time_tracking_role_permission";

/**
 * Generate a random role permission assignment via the API for E2E testing.
 *
 * Prepares random permission assignment data using the prepare function, then
 * calls the creation endpoint to assign the permission code to a specific role
 * within an organization. The organization and role are identified by their
 * UUIDs, which must be provided as path parameters.
 *
 * The permission code is randomly selected from the nine valid system permission
 * codes: org:manage, employee:manage, employee:view, project:manage,
 * project:view, time:manage, time:approve, time:view_all, and report:view.
 * Custom input values can override the generated permission code.
 *
 * @param connection - The API connection configuration
 * @param props.body - Optional partial data to customize the generated
 *                     permission code. Only permission_code is supported.
 * @param props.params - Path parameters for the API request
 * @param props.params.organizationId - The UUID of the organization that owns
 *                                      the role
 * @param props.params.roleId - The UUID of the role to assign the permission to
 * @returns The created or restored role-permission mapping record
 */
export async function generate_random_hrm_time_tracking_member_organizations_roles_permissions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingRolePermission.ICreate> | undefined;
    params: {
      organizationId: string;
      roleId: string;
    };
  }
): Promise<IHrmTimeTrackingRolePermission> {
  const prepared: IHrmTimeTrackingRolePermission.ICreate = prepare_random_hrm_time_tracking_role_permission(
    props.body
  );
  return await api.functional.hrmTimeTracking.member.organizations.roles.permissions.create(
    connection,
    {
      body: prepared,
      organizationId: props.params.organizationId,
      roleId: props.params.roleId,
    },
  );
}