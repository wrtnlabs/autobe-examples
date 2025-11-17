import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventory";

export async function test_api_shopping_mall_inventory_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer joins and authenticates
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "Password123!",
        href: "https://example.com/signup",
        referrer: "https://referrer.example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Prepare inventory creation data adhering to business constraints
  const skuCode: string = RandomGenerator.alphaNumeric(10);
  const inventoryCreateBody = {
    quantity: RandomGenerator.pick([0, 1, 10, 100, 999]) as number,
    reserved_quantity: 0,
    restock_date: null,
  } satisfies IShoppingMallInventory.ICreate;

  // 3. Create inventory record
  const createdInventory: IShoppingMallInventory =
    await api.functional.shoppingMall.customer.shoppingMallProductVariants.shoppingMallInventories.create(
      connection,
      {
        skuCode: skuCode,
        body: inventoryCreateBody,
      },
    );
  typia.assert(createdInventory);

  // 4. Validate returned inventory record
  TestValidator.predicate(
    "created inventory has id",
    typeof createdInventory.id === "string" && createdInventory.id.length > 0,
  );

  TestValidator.equals(
    "quantity matches input",
    createdInventory.quantity,
    inventoryCreateBody.quantity,
  );

  TestValidator.equals(
    "reserved_quantity is zero",
    createdInventory.reserved_quantity,
    inventoryCreateBody.reserved_quantity,
  );

  TestValidator.equals(
    "restock_date is null",
    createdInventory.restock_date,
    null,
  );

  TestValidator.predicate(
    "created_at is valid ISO string",
    typeof createdInventory.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
        createdInventory.created_at,
      ),
  );

  TestValidator.predicate(
    "updated_at is valid ISO string",
    typeof createdInventory.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
        createdInventory.updated_at,
      ),
  );

  TestValidator.equals(
    "deleted_at is null or undefined",
    createdInventory.deleted_at ?? null,
    null,
  );
}
