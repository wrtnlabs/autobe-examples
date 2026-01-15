import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallComplianceFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComplianceFile";
import type { IShoppingMallComplianceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComplianceRecord";
import { prepare_random_shopping_mall_compliance_record } from "../prepare/prepare_random_shopping_mall_compliance_record";
export async function generate_random_shopping_mall_compliance_records_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallComplianceRecord.ICreate> | undefined;
  },
): Promise<IShoppingMallComplianceRecord> {
  const prepared: IShoppingMallComplianceRecord.ICreate =
    prepare_random_shopping_mall_compliance_record(props.body);
  const result: IShoppingMallComplianceRecord =
    await api.functional.shoppingMall.compliance.records.create(connection, {
      body: prepared,
    });
  return result;
}
