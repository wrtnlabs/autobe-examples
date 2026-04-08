import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
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

export async function test_api_product_creation_with_subcategory_assignment(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test product creation with a subcategory assignment for an authenticated seller.
   *
   * Verifies that a seller can create a new catalog product while preserving the
   * ownership relationship to the authenticated account and the assigned category
   * reference. The test focuses on the product creation path, response integrity,
   * and the business rule that the created product belongs to the seller who
   * submitted the request.
   *
   * 1. Authenticate a seller session on an isolated connection.
   * 2. Create a product using a UUID category reference intended to represent a subcategory.
   * 3. Validate the created product response fields against the request and authenticated seller.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.mallPlatform.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IMallPlatformSeller.IJoin,
    },
  );
  typia.assert(seller);
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    categoryId,
    basePrice: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IMallPlatformProduct.ICreate;
  const product = await api.functional.mallPlatform.seller.products.create(
    sellerConnection,
    { body },
  );
  typia.assert(product);
  TestValidator.equals(
    "created product is owned by authenticated seller",
    product.sellerAccount.id,
    seller.id,
  );
  TestValidator.equals(
    "created product seller email matches authenticated seller",
    product.sellerAccount.email,
    seller.email,
  );
  TestValidator.equals(
    "created product keeps assigned category identifier",
    product.category?.id ?? null,
    categoryId,
  );
  TestValidator.equals(
    "created product name matches request",
    product.name,
    body.name,
  );
  TestValidator.equals(
    "created product description matches request",
    product.description,
    body.description,
  );
  TestValidator.equals(
    "created product base price matches request",
    product.basePrice,
    body.basePrice,
  );
  TestValidator.predicate(
    "created product is an active catalog item",
    product.deletedAt === null,
  );
}
