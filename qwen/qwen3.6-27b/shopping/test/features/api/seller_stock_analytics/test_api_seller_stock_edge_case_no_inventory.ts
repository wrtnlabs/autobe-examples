import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerApprovalRequest";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformStockAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformStockAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformStockAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformStockAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Verify that product variants with no inventory records default to currentStock = 0 with out_of_stock status.
 *
 * Sets up product and variant infrastructure but deliberately creates NO inventory records for the variant. Tests that when a seller queries the stock analytics endpoint filtered by product_id, the variant with zero inventory records appears with currentStock = 0 and availabilityStatus is 'out_of_stock'. The COALESCE(SUM(quantity_delta), 0) defaults to 0 when no inventory history exists. Validates that variant data is still returned despite no inventory history, confirming the variant is non-deleted and active, with correctly populated sku_code, product_name, and shop_name fields.
 *
 * 1. Admin joins and logs in to the platform.
 * 2. Admin creates a product category.
 * 3. Seller joins with pending approval status.
 * 4. Admin approves the seller's registration request.
 * 5. Seller logs in with approved credentials.
 * 6. Seller creates a product in the category.
 * 7. Seller creates a product variant WITHOUT adding any inventory records.
 * 8. Seller queries stock analytics filtered by the product_id.
 * 9. Validates the variant appears with currentStock = 0 and availabilityStatus = 'out_of_stock'.
 */
export async function test_api_seller_stock_edge_case_no_inventory(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and logs in
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Admin creates a product category
  const category: IEcommercePlatformCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(category);
  // 3. Seller joins
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommercePlatformSeller.IJoin;
  const sellerJoinAuth: IEcommercePlatformSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, { body: sellerJoinBody });
  typia.assert(sellerJoinAuth);
  // 4. Admin approves the seller
  const approvalRequest: IEcommercePlatformSellerApprovalRequest =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.update(
      adminConnection,
      {
        requestId: sellerJoinAuth.id,
        body: {
          status: "approved",
        } satisfies IEcommercePlatformSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvalRequest);
  // 5. Seller logs in
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommercePlatformSeller.ILogin;
  const sellerLoginAuth: IEcommercePlatformSeller.IAuthorized =
    await authorize_seller_login(sellerLoginConnection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuth);
  // 6. Seller creates a product
  const productBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    base_price: typia.random<number & tags.Minimum<0>>(),
    category_id: category.id,
  } satisfies IEcommercePlatformProduct.ICreate;
  const product: IEcommercePlatformProduct =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerLoginConnection,
      { body: productBody },
    );
  typia.assert(product);
  // 7. Seller creates a product variant (NO inventory records added)
  const optionsCount = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
  >();
  const options = ArrayUtil.repeat(
    optionsCount,
    () =>
      ({
        attributeKey: RandomGenerator.pick(["color", "size", "material"]),
        attributeValue: RandomGenerator.alphabets(5),
      }) satisfies IEcommercePlatformProductVariantOption.ICreate,
  );
  const variantBody = {
    skuCode: RandomGenerator.alphaNumeric(10),
    price: typia.random<number & tags.Minimum<0>>(),
    options,
  } satisfies IEcommercePlatformProductVariant.ICreate;
  const variant: IEcommercePlatformProductVariant =
    await api.functional.ecommercePlatform.seller.products.variants.create(
      sellerLoginConnection,
      {
        productId: product.id,
        body: variantBody,
      },
    );
  typia.assert(variant);
  // 8. Seller queries stock analytics filtered by product_id
  const stockResult: IPageIEcommercePlatformStockAnalytic.ISummary =
    await api.functional.ecommercePlatform.seller.analytics.stock.index(
      sellerLoginConnection,
      {
        body: {
          product_id: product.id,
        } satisfies IEcommercePlatformStockAnalytic.IRequest,
      },
    );
  typia.assert(stockResult);
  // 9. Validate the variant appears with currentStock = 0 and availabilityStatus = 'out_of_stock'
  const matchingVariant = stockResult.data.find(
    (item) => item.variantId === variant.id,
  );
  TestValidator.predicate(
    "variant exists in stock analytics",
    matchingVariant !== undefined,
  );
  const safeVariant = typia.assert(matchingVariant!);
  TestValidator.equals(
    "currentStock is 0 when no inventory records exist",
    safeVariant.currentStock,
    0,
  );
  TestValidator.equals(
    "availabilityStatus is out_of_stock when currentStock is 0",
    safeVariant.availabilityStatus,
    "out_of_stock",
  );
  TestValidator.equals(
    "sku_code matches the created variant",
    safeVariant.skuCode,
    variant.sku_code,
  );
  TestValidator.equals(
    "product_name matches the created product",
    safeVariant.productName,
    product.name,
  );
  TestValidator.predicate(
    "shop_name is populated",
    safeVariant.shopName.length > 0,
  );
}
