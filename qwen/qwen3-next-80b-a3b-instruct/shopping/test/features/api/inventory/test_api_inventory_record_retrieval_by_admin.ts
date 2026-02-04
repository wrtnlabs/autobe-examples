import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_record_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies IShoppingMallAdmin.IJoin;
  const adminData = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminData);
  // Step 2: Generate a random inventoryId (simulating an existing record)
  const inventoryId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve the inventory record using admin connection
  const retrievedRecord =
    await api.functional.shoppingMall.admin.inventory.records.at(
      adminConnection,
      {
        inventoryId,
      },
    );
  typia.assert(retrievedRecord);
  // Step 4: Verify all required fields are present and correctly typed
  // IShoppingMallInventoryRecord has: totalQuantityChange, transactionCount, averageChange
  TestValidator.predicate(
    "totalQuantityChange is number",
    typeof retrievedRecord.totalQuantityChange === "number",
  );
  TestValidator.predicate(
    "transactionCount is number",
    typeof retrievedRecord.transactionCount === "number",
  );
  TestValidator.predicate(
    "averageChange is number",
    typeof retrievedRecord.averageChange === "number",
  );
  // Step 5: Verify that the values are reasonable for their types
  TestValidator.predicate(
    "totalQuantityChange is integer",
    Number.isInteger(retrievedRecord.totalQuantityChange),
  );
  TestValidator.predicate(
    "transactionCount is positive integer",
    Number.isInteger(retrievedRecord.transactionCount) &&
      retrievedRecord.transactionCount >= 0,
  );
  TestValidator.predicate(
    "averageChange is a number",
    typeof retrievedRecord.averageChange === "number",
  );
}
