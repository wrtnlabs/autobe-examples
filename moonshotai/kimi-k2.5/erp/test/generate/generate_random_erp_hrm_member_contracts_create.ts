import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_contract } from "../prepare/prepare_random_erp_hrm_contract";

export async function generate_random_erp_hrm_member_contracts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmContract.ICreate> | undefined;
  },
): Promise<IErpHrmContract> {
  const prepared: IErpHrmContract.ICreate = prepare_random_erp_hrm_contract(
    props.body,
  );
  const result: IErpHrmContract =
    await api.functional.erpHrm.member.contracts.create(connection, {
      body: prepared,
    });
  return result;
}
