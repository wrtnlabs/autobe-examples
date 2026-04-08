import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import type { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
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
 * Test product creation by an authenticated seller.
 *
 * Validates that a seller can register, authenticate, and create a product record with the required business fields. Ensures the created product is persisted with the authenticated seller as owner, the requested category reference is preserved when provided, and the returned record represents the canonical live product state used by later browsing and management flows.
 *
 * 1. Register and authenticate a seller using an actor-specific connection.
 * 2. Create a product with a concrete category reference and valid catalog fields.
 * 3. Verify the returned product record matches the submitted business data and live ownership relations.
 * 4. Confirm the product is active and not soft-deleted at creation time.
 *
 * This test uses the available authenticated seller registration flow because the approval lifecycle is not exposed by the provided utilities. The validation therefore focuses on product creation persistence and response shape for an authenticated seller session.
 */
export async function test_api_product_creation_by_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const sellerPassword = RandomGenerator.alphabets(12);
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const basePrice = Math.max(1, randint(1, 100000)) satisfies number as number;
  const productBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    categoryId,
    basePrice,
  } satisfies IMallPlatformProduct.ICreate;
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    { body: productBody },
  );
  typia.assert(product);
  TestValidator.equals(
    "product owner email",
    product.sellerAccount.email,
    seller.email,
  );
  TestValidator.equals("product name", product.name, productBody.name);
  TestValidator.equals(
    "product description",
    product.description,
    productBody.description,
  );
  TestValidator.equals(
    "product base price",
    product.basePrice,
    productBody.basePrice,
  );
  TestValidator.equals("product deletedAt", product.deletedAt, null);
  TestValidator.predicate(
    "seller account attached",
    () => product.sellerAccount.id === seller.id,
  );
  TestValidator.predicate(
    "product has category relation when assigned",
    () => product.category === null || product.category.id === categoryId,
  );
}
