import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_role_permission } from "../prepare/prepare_random_hrm_platform_role_permission";

export async function generate_random_hrm_platform_member_roles_permissions_create(
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
  const result: IHrmPlatformRolePermission =
    await api.functional.hrmPlatform.member.roles.permissions.create(
      connection,
      {
        body: prepared,
        roleId: props.params.roleId,
      },
    );
  return result;
}
