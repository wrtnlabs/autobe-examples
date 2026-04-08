import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_department } from "../prepare/prepare_random_erp_hrm_time_department";

export async function generate_random_erp_hrm_time_member_departments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimeDepartment.ICreate> | undefined;
  },
): Promise<IErpHrmTimeDepartment> {
  const prepared: IErpHrmTimeDepartment.ICreate =
    prepare_random_erp_hrm_time_department(props.body);
  return await api.functional.erpHrmTime.member.departments.create(connection, {
    body: prepared,
  });
}
