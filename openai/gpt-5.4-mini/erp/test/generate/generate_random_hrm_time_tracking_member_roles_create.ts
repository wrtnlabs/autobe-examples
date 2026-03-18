import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_role } from "../prepare/prepare_random_hrm_time_tracking_role";

export async function generate_random_hrm_time_tracking_member_roles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingRole.ICreate> | undefined;
  },
): Promise<IHrmTimeTrackingRole> {
  const prepared: IHrmTimeTrackingRole.ICreate =
    prepare_random_hrm_time_tracking_role(props.body);
  return await api.functional.hrmTimeTracking.member.roles.create(connection, {
    body: prepared,
  });
}
