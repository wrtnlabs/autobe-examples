import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_role_permission } from "../prepare/prepare_random_hrm_time_tracking_role_permission";

export async function generate_random_hrm_time_tracking_member_roles_permissions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingRolePermission.ICreate> | undefined;
    params: {
      roleId: string;
    };
  },
): Promise<IHrmTimeTrackingRole> {
  const prepared: IHrmTimeTrackingRolePermission.ICreate =
    prepare_random_hrm_time_tracking_role_permission(props.body);
  return await api.functional.hrmTimeTracking.member.roles.permissions.create(
    connection,
    {
      body: prepared,
      roleId: props.params.roleId,
    },
  );
}
