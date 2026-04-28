import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_role_permission } from "../prepare/prepare_random_hrm_platform_role_permission";

/**
 * Generates a random HRM platform role permission mapping for E2E testing.
 *
 * Creates a random role-permission mapping by preparing the input data using the prepare function,
 * then calls the `create` API endpoint to grant a specific platform capability to a custom role.
 *
 * @param connection - The API connection instance.
 * @param props - Properties for the generation, including optional body data and required roleId parameter.
 * @returns The created IHrmPlatformRolePermission object.
 */
export async function generate_random_hrm_platform_member_roles_role_permissions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformRolePermission.ICreate>;
    params: {
      roleId: string;
    };
  },
): Promise<IHrmPlatformRolePermission> {
  const prepared: IHrmPlatformRolePermission.ICreate =
    prepare_random_hrm_platform_role_permission(props.body);
  return await api.functional.hrmPlatform.member.roles.role_permissions.create(
    connection,
    {
      body: prepared,
      roleId: props.params.roleId,
    },
  );
}
