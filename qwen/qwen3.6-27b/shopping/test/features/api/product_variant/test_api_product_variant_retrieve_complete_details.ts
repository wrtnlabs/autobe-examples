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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSellerApprovalRequest";
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
 * Test successful retrieval of a product variant with complete details.
 *
 * Validates the full lifecycle of product variant creation and retrieval, including administrator category setup, seller registration and approval workflow, product creation, and variant configuration with explicit price override and multiple option attributes. Ensures that the retrieved variant contains all expected fields with correct values and proper ordering.
 *
 * Special attention is given to verifying that the options array is ordered alphabetically by attribute_key, the stock_quantity is initialized to zero, the variant-specific price override is correctly applied, and all nested product/seller/category summaries are properly populated.
 *
 * 1. Administrator authenticates and creates a product category.
 * 2. Seller account registers with pending approval status.
 * 3. Admin searches for the pending seller approval request.
 * 4. Admin approves the seller to grant selling privileges.
 * 5. Approved seller creates a product in the created category.
 * 6. Seller creates a product variant with explicit price override and multiple option attributes.
 * 7. Retrieves the variant using GET endpoint and validates all fields.
 */
export async function test_api_product_variant_retrieve_complete_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication and category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLoginEmail = typia.random<string & tags.Format<"email">>();
  const adminResult = await authorize_admin_join(adminConnection, {});
  const category = await generate_random_ecommerce_platform_admin_categories_create(adminConnection, {});
  typia.assert(category);

  // 2. Seller registration with pending approval status
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerLoginEmail = typia.random<string & tags.Format<"email">>();
  const sellerCreds = {
    email: sellerLoginEmail,
    password: "1234",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommercePlatformSeller.IJoin;
  await authorize_seller_join(sellerConnection, { body: sellerCreds });

  // 3. Admin searches for pending seller approval requests
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminLoginEmail,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  const approvalRequests = await api.functional.ecommercePlatform.admin.seller_approval_requests.index(
    adminLoginConnection,
    {
      body: { status: "pending", page: 1, limit: 10 } satisfies IEcommercePlatformSellerApprovalRequest.IRequest,
    },
  );
  typia.assert(approvalRequests);
  const pendingRequest = approvalRequests.data.find((req) => req.seller.email === sellerLoginEmail)!;
  typia.assertGuard(pendingRequest);

  // 4. Admin approves the seller
  await api.functional.ecommercePlatform.admin.seller_approval_requests.update(
    adminLoginConnection,
    {
      requestId: pendingRequest.id,
      body: { status: "approved", reason: null } satisfies IEcommercePlatformSellerApprovalRequest.IUpdate,
    },
  );

  // 5. Approved seller logs in and creates a product
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerLoginEmail,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  const product = await generate_random_ecommerce_platform_seller_products_create(sellerLoginConnection, {
    body: { category_id: category.id },
  });
  typia.assert(product);

  // 6. Seller creates a product variant with explicit price override and multiple options
  const variantPrice = typia.random<number & tags.Minimum<0>>();
  const variant = await generate_random_ecommerce_platform_seller_products_variants_create(sellerLoginConnection, {
    params: { productId: product.id },
    body: {
      price: variantPrice,
      options: [
        { attributeKey: "color", attributeValue: "Red" },
        { attributeKey: "size", attributeValue: "Large" },
        { attributeKey: "material", attributeValue: "Cotton" },
      ] satisfies IEcommercePlatformProductVariantOption.ICreate[],
    },
  });
  typia.assert(variant);

  // 7. Retrieve the variant using GET endpoint
  const variantConnection: api.IConnection = { host: connection.host };
  const retrievedVariant = await api.functional.ecommercePlatform.products.variants.at(variantConnection, {
    productId: product.id,
    variantId: variant.id,
  });
  typia.assert(retrievedVariant);

  // Validate sku_code matches the created variant's SKU
  TestValidator.equals("sku_code matches", retrievedVariant.sku_code, variant.sku_code);
  // Validate price reflects the explicit variant-specific price override
  TestValidator.equals("price matches override", retrievedVariant.price, variantPrice);
  // Validate stock_quantity equals 0 (initial inventory ledger state)
  TestValidator.equals("stock_quantity is zero", retrievedVariant.stock_quantity, 0);

  // Validate options array contains all created key-value attribute pairs
  const expectedOptions = [
    { attributeKey: "color", attributeValue: "Red" },
    { attributeKey: "material", attributeValue: "Cotton" },
    { attributeKey: "size", attributeValue: "Large" },
  ] satisfies IEcommercePlatformProductVariantOption.ICreate[];
  TestValidator.equals(
    "options match created attributes",
    retrievedVariant.options.map((opt) => ({ attributeKey: opt.attributeKey, attributeValue: opt.attributeValue })),
    expectedOptions,
  );

  // Validate options array is ordered alphabetically by attribute_key
  const sortedOptions = [...retrievedVariant.options].sort((a, b) =>
    a.attributeKey < b.attributeKey ? -1 : a.attributeKey > b.attributeKey ? 1 : 0,
  );
  TestValidator.equals("options are alphabetically ordered", retrievedVariant.options, sortedOptions);

  // Validate product summary includes product name, description, base_price
  TestValidator.equals("product name matches", retrievedVariant.product.name, product.name);
  TestValidator.equals("product description matches", retrievedVariant.product.description, product.description);
  TestValidator.predicate("product has valid base_price", product.base_price > 0);

  // Validate category info is present
  TestValidator.equals("category name matches", retrievedVariant.product.category.name, category.name);

  // Validate timestamps are present (typia.assert already validates ISO 8601 format via tags)
  TestValidator.predicate("created_at is present", retrievedVariant.created_at.length > 0);
  TestValidator.predicate("updated_at is present", retrievedVariant.updated_at.length > 0);
  // Validate deleted_at is NOT exposed in normal responses
  TestValidator.predicate("deleted_at is not exposed", retrievedVariant.deleted_at === undefined);
}