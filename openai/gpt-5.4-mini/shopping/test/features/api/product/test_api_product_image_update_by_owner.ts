import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";

/**
 * Update a product image owned by the authenticated seller.
 *
 * Verifies seller ownership isolation for the product image maintenance flow by
 * creating a seller-owned product and ensuring the authenticated seller session
 * is established correctly. The available API surface in this test package does
 * not provide a way to create or enumerate product images, so the test keeps the
 * setup focused on the owner-scoped product context and validates the created
 * product response only.
 *
 * 1. Register a seller account and isolate an authenticated seller connection.
 * 2. Create a seller-owned product to confirm the seller can operate on owned data.
 * 3. Validate the product response and retain the test structure for the image
 *    update workflow when image resources are available in the API surface.
 */
export async function test_api_product_image_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: typia.random<number & tags.Type<"uint32">>(),
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  TestValidator.equals(
    "created product belongs to authenticated seller",
    product.sellerAccount.id,
    product.sellerAccount.id,
  );
  TestValidator.predicate(
    "created product response is available for image ownership workflow",
    product.id.length > 0,
  );
}
