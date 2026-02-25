import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_category_usage_statistics_empty_and_soft_deleted_categories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. No product creation functions exist, so we cannot test categories with products
  // However, we can test empty categories and soft-deleted categories
  // Create three categories:
  // Category 1: Active category with random name
  // Category 2: Active category without products (empty)
  // Category 3: Category to be soft-deleted
  // Note: Since there's no API for creating categories in provided SDK,
  // we cannot actually create categories. This test will only verify
  // the API response structure and ensure it returns valid data.
  // The scenario's edge cases cannot be fully tested due to missing
  // category creation endpoints.
  // 3. Query category usage statistics
  const statistics =
    await api.functional.ecommerce.administrator.category_usage.at(
      adminConnection,
    );
  typia.assert(statistics);
  // 4. Validate response structure
  // The response should be an IEcommerceCategory object
  // Check basic structure
  TestValidator.predicate(
    "response has id field",
    typeof statistics.id === "string",
  );
  TestValidator.predicate(
    "response has name field",
    typeof statistics.name === "string",
  );
  TestValidator.predicate(
    "response has created_at field",
    typeof statistics.created_at === "string",
  );
  TestValidator.predicate(
    "response has updated_at field",
    typeof statistics.updated_at === "string",
  );
  // Parent category field should be either ISummary object or null
  if (statistics.parent !== null && statistics.parent !== undefined) {
    TestValidator.predicate(
      "parent has id field",
      typeof statistics.parent.id === "string",
    );
    TestValidator.predicate(
      "parent has name field",
      typeof statistics.parent.name === "string",
    );
    TestValidator.predicate(
      "parent has products_count field",
      typeof statistics.parent.products_count === "number",
    );
    TestValidator.predicate(
      "parent has created_at field",
      typeof statistics.parent.created_at === "string",
    );
    // Parent can have nested parent (or null)
    if (statistics.parent.parent !== null) {
      TestValidator.predicate(
        "nested parent has id field",
        typeof statistics.parent.parent.id === "string",
      );
    }
  }
  // 5. Since we cannot create actual categories, we validate that
  // the API at least returns successfully and matches expected structure
  // according to IEcommerceCategory DTO
  console.log(
    `Category usage statistics retrieved for administrator: ${statistics.name}`,
  );
}
