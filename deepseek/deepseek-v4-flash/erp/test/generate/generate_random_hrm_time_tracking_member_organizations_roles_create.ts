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

import { prepare_random_hrm_time_tracking_role } from "../prepare/prepare_random_hrm_time_tracking_role";

/**
 * Generate a random HRM time tracking role via the API for E2E testing.
 *
 * Prepares random role creation data using the prepare function, then calls
 * the create role endpoint to create an actual role resource within the
 * specified organization. The generated role receives a randomly assigned
 * set of system permissions from the available codes.
 *
 * @param connection API connection configuration
 * @param props Properties containing optional role creation overrides and required organization ID
 * @returns The created role with its assigned permissions
 */
export async function generate_random_hrm_time_tracking_member_organizations_roles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingRole.ICreate> | undefined;
    params: {
      organizationId: string;
    };
  }
): Promise<IHrmTimeTrackingRole> {
  const prepared: IHrmTimeTrackingRole.ICreate = prepare_random_hrm_time_tracking_role(
    props.body
  );
  return await api.functional.hrmTimeTracking.member.organizations.roles.create(
    connection,
    {
      body: prepared,
      organizationId: props.params.organizationId,
    },
  );
}