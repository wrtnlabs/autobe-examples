import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_detailed_view_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin authenticates using the join operation
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "ValidPassword123!",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Request detailed info of a specific customer by ID using admin authorization
  // For testing, generate a random UUID to query
  const customerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.admin.customers.at(connection, {
      id: customerId,
    });
  typia.assert(customer);

  // 3. Validate the response contains all needed fields with proper types
  TestValidator.predicate("customer has id", typeof customer.id === "string");
  TestValidator.predicate(
    "customer email is string",
    typeof customer.email === "string",
  );
  TestValidator.predicate(
    "customer password_hash is string",
    typeof customer.password_hash === "string",
  );
  TestValidator.predicate(
    "customer nickname is string",
    typeof customer.nickname === "string",
  );
  TestValidator.predicate(
    "customer created_at is string",
    typeof customer.created_at === "string",
  );
  TestValidator.predicate(
    "customer updated_at is string",
    typeof customer.updated_at === "string",
  );

  // deleted_at can be null or string
  TestValidator.predicate(
    "customer deleted_at is null or string",
    customer.deleted_at === null || typeof customer.deleted_at === "string",
  );

  // 4. Implicit authorization enforcement is guaranteed by SDK token management
  // (No manual header manipulation needed because SDK handles JWT automatically)
}
