import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_role } from "../prepare/prepare_random_hrm_role";

/**
 * Generate a random HRM role via the API for E2E testing.
 *
 * Prepares random role data using the prepare function, then calls the creation endpoint to create a custom role within an organization.
 *
 * This function creates organization-scoped custom roles that can be assigned specific permissions. The role is created with a unique name within the organization and cannot conflict with built-in role names (Owner, Manager, Employee).
 *
 * @param connection The API connection object
 * @param props.body Optional partial role data to override random generation
 * @param props.params.organizationId The organization ID where the role will be created
 * @returns The created role object with all fields including generated ID and timestamps
 */
export async function generate_random_hrm_member_organizations_roles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmRole.ICreate> | undefined;
    params?:
      | {
          organizationId: string;
        }
      | undefined;
  },
): Promise<IHrmRole> {
  const prepared: IHrmRole.ICreate = prepare_random_hrm_role(props.body);
  const result: IHrmRole =
    await api.functional.hrm.member.organizations.roles.create(connection, {
      organizationId: props.params!.organizationId,
      body: prepared,
    });
  return result;
}