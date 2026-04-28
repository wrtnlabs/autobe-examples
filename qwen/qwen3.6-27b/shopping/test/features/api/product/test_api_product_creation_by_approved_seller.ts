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
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";

/**
 * Test product creation workflow after seller approval by an administrator.
 *
 * Validates the complete product creation flow: administrative category creation, seller registration with pending approval status, admin seller approval, seller login, and product creation. Verifies that the approved seller creates a product with proper category assignment, seller profile linkage, auto-generated UUID, and empty variants array.
 *
 * 1. Administrator joins and creates a product category.
 * 2. Seller registers with credentials, getting pending approval status.
 * 3. Administrator attempts to approve seller via SDK (no utility/list endpoint exists for approval requests).
 * 4. Seller logs in with registration credentials.
 * 5. Seller creates a product referenced to the category.
 * 6. Validates product entity structure and relationships.
 */
export async function test_api_product_creation_by_approved_seller(
  connection: api.IConnection,
) {
  // 1. Administrator joins the platform
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Admin creates a product category
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers (creates pending approval request automatically)
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuthorized);
  TestValidator.equals(
    "seller has pending approval status",
    sellerAuthorized.approval_status,
    "pending",
  );
  // 3. Admin approves the seller's pending approval request
  // Note: No utility or list endpoint exists, using generated UUID as requestId
  const sellerApprovalRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const updateBody = {
    status: "approved",
    reason: null,
  } satisfies IEcommercePlatformSellerApprovalRequest.IUpdate;
  const approvalRequest =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.update(
      adminConnection,
      {
        requestId: sellerApprovalRequestId,
        body: updateBody,
      },
    );
  typia.assert(approvalRequest);
  TestValidator.equals(
    "seller approval status is approved",
    approvalRequest.status,
    "approved",
  );
  // 4. Seller logs in
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuthorized.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    },
  });
  // 5. Seller creates a product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerLoginConnection,
      {
        body: {
          category_id: category.id,
        },
      },
    );
  typia.assert(product);
  // 6. Validate product creation response
  TestValidator.predicate(
    "product has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      product.id,
    ),
  );
  TestValidator.equals(
    "product category matches created category",
    product.category.id,
    category.id,
  );
  TestValidator.equals(
    "product category name matches",
    product.category.name,
    category.name,
  );
  TestValidator.predicate(
    "product has seller profile associated",
    product.seller.id !== null,
  );
  TestValidator.equals(
    "product variants array is empty",
    product.variants.length,
    0,
  );
  TestValidator.equals(
    "product images array is empty",
    product.images.length,
    0,
  );
  TestValidator.predicate(
    "product has valid base price",
    product.base_price > 0,
  );
  TestValidator.predicate("product name is not empty", product.name.length > 0);
  TestValidator.predicate(
    "product description is not empty",
    product.description.length > 0,
  );
  TestValidator.predicate(
    "product min_variant_price is null when no variants",
    product.min_variant_price === null,
  );
  TestValidator.predicate(
    "product max_variant_price is null when no variants",
    product.max_variant_price === null,
  );
  TestValidator.equals("wishlist count is zero", product.wishlist_count, 0);
}
