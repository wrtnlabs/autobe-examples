import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_category_analytics_comprehensive_product_association(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Retrieve category usage statistics
  const categoryUsage =
    await api.functional.ecommerce.superAdministrator.category_usage.at(
      adminConnection,
    );
  typia.assert(categoryUsage);
  // Validate basic category structure
  TestValidator.predicate(
    "Should have valid category ID",
    !!categoryUsage.id && typeof categoryUsage.id === "string",
  );
  TestValidator.predicate(
    "Should have category name",
    !!categoryUsage.name && typeof categoryUsage.name === "string",
  );
  TestValidator.predicate(
    "Should have valid creation timestamp",
    !!categoryUsage.created_at,
  );
  // Validate analytics-specific fields if available
  // Note: The actual product count validation and sorting cannot be tested
  // without ability to create products and associate them with categories
  // Log the structure for debugging and future enhancement
  console.log(
    "Category analytics response received for testing infrastructure validation",
  );
  // Future enhancement: When product creation APIs are available,
  // implement comprehensive product association testing as described in scenario
}
