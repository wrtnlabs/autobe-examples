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

export async function test_api_product_variant_list_own_product(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const sellerPassword = `P@ssw0rd-${RandomGenerator.alphaNumeric(8)}`;
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: 10000,
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const variantBodies: IMallPlatformProductVariant.ICreate[] = [
    {
      skuCode: `${RandomGenerator.alphaNumeric(6)}-RED-S`,
      optionValues: "color: Red, size: S",
      priceOverride: 12000,
    },
    {
      skuCode: `${RandomGenerator.alphaNumeric(6)}-BLUE-M`,
      optionValues: "color: Blue, size: M",
      priceOverride: 13000,
    },
    {
      skuCode: `${RandomGenerator.alphaNumeric(6)}-BLACK-L`,
      optionValues: "color: Black, size: L",
      priceOverride: null,
    },
  ];
  const createdVariants = await ArrayUtil.asyncMap(
    variantBodies,
    async (body) => {
      const variant =
        await generate_random_mall_platform_seller_products_variants_create(
          sellerConnection,
          {
            params: { productId: product.id },
            body,
          },
        );
      typia.assert(variant);
      return variant;
    },
  );
  const page1 =
    await api.functional.mallPlatform.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 2,
          sort: "+skuCode",
        } satisfies IMallPlatformProductVariant.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page one current", page1.pagination.current, 1);
  TestValidator.equals("page one limit", page1.pagination.limit, 2);
  TestValidator.equals(
    "page one total records",
    page1.pagination.records,
    createdVariants.length,
  );
  TestValidator.equals(
    "page one total pages",
    page1.pagination.pages,
    Math.ceil(createdVariants.length / 2),
  );
  TestValidator.equals("page one size", page1.data.length, 2);
  TestValidator.predicate(
    "all page one variants belong to the requested product",
    page1.data.every((item) => item.product.id === product.id),
  );
  for (const item of page1.data) {
    TestValidator.equals("variant product id", item.product.id, product.id);
    TestValidator.equals(
      "variant product name",
      item.product.name,
      product.name,
    );
    TestValidator.equals(
      "variant product base price",
      item.product.basePrice,
      product.basePrice,
    );
    TestValidator.predicate("variant has id", item.id.length > 0);
    TestValidator.predicate("variant has sku", item.skuCode.length > 0);
    TestValidator.predicate(
      "variant has options",
      item.optionValues.length > 0,
    );
    TestValidator.predicate(
      "variant has timestamps",
      item.createdAt.length > 0 && item.updatedAt.length > 0,
    );
    TestValidator.equals("variant deletedAt", item.deletedAt, null);
  }
  const page2 =
    await api.functional.mallPlatform.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 2,
          limit: 2,
          sort: "+skuCode",
        } satisfies IMallPlatformProductVariant.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page two current", page2.pagination.current, 2);
  TestValidator.equals("page two limit", page2.pagination.limit, 2);
  TestValidator.equals(
    "page two total records",
    page2.pagination.records,
    createdVariants.length,
  );
  TestValidator.equals(
    "page two total pages",
    page2.pagination.pages,
    Math.ceil(createdVariants.length / 2),
  );
  TestValidator.equals(
    "page two size",
    page2.data.length,
    createdVariants.length - 2,
  );
  TestValidator.predicate(
    "page two variants belong to the requested product",
    page2.data.every((item) => item.product.id === product.id),
  );
  TestValidator.predicate(
    "page two variants continue the product listing",
    page2.data.every((item) =>
      createdVariants.some((created) => created.id === item.id),
    ),
  );
  const listedIds = [...page1.data, ...page2.data].map((variant) => variant.id);
  TestValidator.equals(
    "all listed ids count",
    listedIds.length,
    createdVariants.length,
  );
  TestValidator.predicate(
    "all created variants are represented in the first two pages",
    createdVariants.every((variant) => listedIds.includes(variant.id)),
  );
}
