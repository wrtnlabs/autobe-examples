import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_role } from "../prepare/prepare_random_erp_hrm_time_role";

export async function generate_random_erp_hrm_time_member_roles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimeRole.ICreate> | undefined;
  },
): Promise<IErpHrmTimeRole> {
  const prepared: IErpHrmTimeRole.ICreate = prepare_random_erp_hrm_time_role(
    props.body,
  );
  const result: IErpHrmTimeRole =
    await api.functional.erpHrmTime.member.roles.create(connection, {
      body: prepared,
    });
  return result;
}
