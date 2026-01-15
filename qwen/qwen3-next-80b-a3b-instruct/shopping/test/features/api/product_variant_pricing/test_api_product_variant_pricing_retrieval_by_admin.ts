import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductVariantPricing } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantPricing";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_variant_pricing_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate valid but non-existent UUIDs for product and pricing
  const nonExistentProductId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  const nonExistentPricingId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Use the admin connection to retrieve pricing data for non-existent resource
  // The system should return 404 Not Found since the resource doesn't exist
  // We must handle the error and verify it's a 404
  await TestValidator.httpError(
    "admin should receive 404 for non-existent pricing",
    404,
    () => {
      return api.functional.shoppingMall.admin.products.pricing.at(
        adminConnection,
        {
          productId: nonExistentProductId,
          pricingId: nonExistentPricingId,
        },
      );
    },
  );
  // Step 4: Verify that non-admin cannot access pricing data
  const nonAdminConnection: api.IConnection = { host: connection.host };
  // Attempt to access pricing without admin authentication should fail with 401
  await TestValidator.httpError(
    "non-admin cannot retrieve pricing",
    401,
    () => {
      return api.functional.shoppingMall.admin.products.pricing.at(
        nonAdminConnection,
        {
          productId: nonExistentProductId,
          pricingId: nonExistentPricingId,
        },
      );
    },
  );
}
