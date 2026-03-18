import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_tracking_contract } from "../prepare/prepare_random_erp_hrm_time_tracking_contract";

export async function generate_random_erp_hrm_time_tracking_member_contracts_create_contract(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimeTrackingContract.ICreate> | undefined;
  },
): Promise<IErpHrmTimeTrackingContract> {
  const prepared: IErpHrmTimeTrackingContract.ICreate =
    prepare_random_erp_hrm_time_tracking_contract(props.body);
  return await api.functional.erpHrmTimeTracking.member.contracts.createContract(
    connection,
    {
      body: prepared,
    },
  );
}
