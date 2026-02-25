import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_snapshots_retrieval_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer to establish authenticated context
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Generate a valid uuid as productId - we assume this product exists and has snapshots
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve product snapshots as the customer (authenticated connection)
  const snapshots =
    await api.functional.shoppingMall.customer.products.snapshots.at(
      customerConnection,
      {
        productId,
      },
    );
  typia.assert(snapshots);
  // 4. Validate structure of response
  TestValidator.equals(
    "pagination exists",
    typeof snapshots.pagination,
    "object",
  );
  TestValidator.equals("data exists", Array.isArray(snapshots.data), true);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current is number",
    typeof snapshots.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination limit is number",
    typeof snapshots.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination records is number",
    typeof snapshots.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages is number",
    typeof snapshots.pagination.pages,
    "number",
  );
  TestValidator.predicate(
    "pagination current >= 0",
    snapshots.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    snapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    snapshots.pagination.pages >= 0,
  );
  // Validate snapshot structure - only fields that exist in provided IShoppingMallProductSnapshot.ISummary
  snapshots.data.forEach((snapshot) => {
    TestValidator.equals("snapshot id is string", typeof snapshot.id, "string");
    TestValidator.predicate(
      "snapshot id is uuid",
      /^[0-9a-f-]{36}$/i.test(snapshot.id),
    );
    TestValidator.equals(
      "snapshot display_name is string or undefined",
      snapshot.display_name === null ||
        typeof snapshot.display_name === "string",
      true,
    );
    TestValidator.equals(
      "snapshot status is string",
      typeof snapshot.status,
      "string",
    );
    TestValidator.predicate(
      "snapshot status is valid",
      ["active", "suspended", "deleted"].includes(snapshot.status),
    );
  });
}