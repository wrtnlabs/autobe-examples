import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_department } from "../prepare/prepare_random_erp_hrm_department";

export async function generate_random_erp_hrm_member_departments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmDepartment.ICreate>;
  },
): Promise<IErpHrmDepartment> {
  const prepared: IErpHrmDepartment.ICreate = prepare_random_erp_hrm_department(
    props.body,
  );
  const result: IErpHrmDepartment =
    await api.functional.erpHrm.member.departments.create(connection, {
      body: prepared,
    });
  return result;
}
