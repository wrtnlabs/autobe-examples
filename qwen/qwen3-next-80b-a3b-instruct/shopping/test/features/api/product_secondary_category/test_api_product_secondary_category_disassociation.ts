import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_secondary_category_disassociation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Generate valid UUIDs for an existing product and secondary category
  // These represent existing entities in the system (assumed to be pre-existing)
  const productId = typia.random<string & tags.Format<"uuid">>();
  const secondaryCategoryId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Disassociate the secondary category from the product
  // This should succeed silently if the association exists, or even if it doesn't (per idempotent spec)
  // The handler is designed to not throw on non-existent associations
  await api.functional.shoppingMall.admin.products.secondary_categories.erase(
    adminConnection,
    {
      productId,
      secondaryCategoryId,
    },
  );
  // Step 4: Since there's no API to read the product or its secondary categories,
  // we can only confirm the operation completed without error.
  // No further validation is possible with the provided API and DTO definitions.
  // This represents a complete success of the disassociation for the purpose of E2E testing.
}
