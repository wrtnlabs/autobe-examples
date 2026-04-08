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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { generate_random_mall_platform_seller_products_variants_create } from "../../../generate/generate_random_mall_platform_seller_products_variants_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";
import { prepare_random_mall_platform_product_variant } from "../../../prepare/prepare_random_mall_platform_product_variant";

/**
 * Verifies that product variant listing is scoped to the requested product only.
 *
 * This test authenticates a seller, creates two products under the same account, seeds both products with overlapping search text in their variants, and then queries the variant list for only the first product.
 * It validates that the endpoint never leaks variants from the second product, even when SKU code or option text would otherwise match the search term, and that pagination reflects only the requested product's variants.
 *
 * 1. Authenticate one seller account.
 * 2. Create two products owned by that seller.
 * 3. Create variants for both products with overlapping text patterns.
 * 4. Query only the first product's variant listing using a shared search token.
 * 5. Validate product scoping and pagination metadata.
 */
export async function test_api_product_variant_list_scoped_to_product(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string,
      password: "1234!@#$" satisfies string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const sharedToken = RandomGenerator.alphabets(8);
  const targetProduct =
    await api.functional.mallPlatform.seller.products.create(sellerConnection, {
      body: {
        name: `Target ${sharedToken}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: 10000,
      } satisfies IMallPlatformProduct.ICreate,
    });
  typia.assert(targetProduct);
  const foreignProduct =
    await api.functional.mallPlatform.seller.products.create(sellerConnection, {
      body: {
        name: `Foreign ${sharedToken}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: 12000,
      } satisfies IMallPlatformProduct.ICreate,
    });
  typia.assert(foreignProduct);
  const targetVariantBodies: IMallPlatformProductVariant.ICreate[] = [
    {
      skuCode: `SKU-${sharedToken}-A`,
      optionValues: `Color ${sharedToken} / Size S`,
      priceOverride: 10000,
    },
    {
      skuCode: `SKU-${sharedToken}-B`,
      optionValues: `Color ${sharedToken} / Size M`,
      priceOverride: 10500,
    },
    {
      skuCode: `SKU-${sharedToken}-C`,
      optionValues: `Color ${sharedToken} / Size L`,
      priceOverride: 11000,
    },
  ];
  const foreignVariantBodies: IMallPlatformProductVariant.ICreate[] = [
    {
      skuCode: `SKU-${sharedToken}-X`,
      optionValues: `Foreign ${sharedToken} / Size XL`,
      priceOverride: 13000,
    },
    {
      skuCode: `SKU-${sharedToken}-Y`,
      optionValues: `Foreign ${sharedToken} / Size XXL`,
      priceOverride: 13500,
    },
  ];
  const targetVariants = await ArrayUtil.asyncMap(
    targetVariantBodies,
    async (body) => {
      const variant =
        await api.functional.mallPlatform.seller.products.variants.create(
          sellerConnection,
          {
            productId: targetProduct.id,
            body,
          },
        );
      typia.assert(variant);
      return variant;
    },
  );
  const foreignVariants = await ArrayUtil.asyncMap(
    foreignVariantBodies,
    async (body) => {
      const variant =
        await api.functional.mallPlatform.seller.products.variants.create(
          sellerConnection,
          {
            productId: foreignProduct.id,
            body,
          },
        );
      typia.assert(variant);
      return variant;
    },
  );
  const page = await api.functional.mallPlatform.seller.products.variants.index(
    sellerConnection,
    {
      productId: targetProduct.id,
      body: {
        search: sharedToken,
        page: 1,
        limit: 10,
        sort: "createdAt",
      } satisfies IMallPlatformProductVariant.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "pagination current page should be 1",
    page.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match the request",
    page.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination record count should include only target product variants",
    page.pagination.records,
    targetVariants.length,
  );
  TestValidator.equals(
    "pagination page count should reflect only target product variants",
    page.pagination.pages,
    1,
  );
  TestValidator.equals(
    "returned row count should match the target product variants",
    page.data.length,
    targetVariants.length,
  );
  TestValidator.predicate(
    "all returned variants must belong to the requested product",
    page.data.every((variant) => variant.product.id === targetProduct.id),
  );
  TestValidator.predicate(
    "no returned variant may belong to the foreign product",
    page.data.every((variant) => variant.product.id !== foreignProduct.id),
  );
  TestValidator.predicate(
    "all returned variants must match the search token",
    page.data.every(
      (variant) =>
        variant.skuCode.includes(sharedToken) ||
        variant.optionValues.includes(sharedToken),
    ),
  );
  TestValidator.predicate(
    "foreign product variants must not appear in the target product list",
    page.data.every((variant) =>
      foreignVariants.every(
        (foreignVariant) => foreignVariant.id !== variant.id,
      ),
    ),
  );
  TestValidator.predicate(
    "target product variants should all be represented in the response",
    targetVariants.every((targetVariant) =>
      page.data.some((variant) => variant.id === targetVariant.id),
    ),
  );
}
