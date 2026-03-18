import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_tracking_department } from "../prepare/prepare_random_erp_hrm_time_tracking_department";

export async function generate_random_erp_hrm_time_tracking_member_departments_create(
  connection: IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimeTrackingDepartment.ICreate> | undefined;
  },
): Promise<IErpHrmTimeTrackingDepartment> {
  const prepared: IErpHrmTimeTrackingDepartment.ICreate =
    prepare_random_erp_hrm_time_tracking_department(props.body);
  return await api.functional.erpHrmTimeTracking.member.departments.create(
    connection,
    {
      body: prepared,
    },
  );
}
