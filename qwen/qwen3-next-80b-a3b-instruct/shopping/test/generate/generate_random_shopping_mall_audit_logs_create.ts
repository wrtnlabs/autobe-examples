import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLog";
import { prepare_random_shopping_mall_audit_log } from "../prepare/prepare_random_shopping_mall_audit_log";
export async function generate_random_shopping_mall_audit_logs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallAuditLog.ICreate> | undefined;
  },
): Promise<IShoppingMallAuditLog> {
  const prepared: IShoppingMallAuditLog.ICreate =
    prepare_random_shopping_mall_audit_log(props.body);
  return await api.functional.shoppingMall.audit.logs.create(connection, {
    body: prepared,
  });
}
