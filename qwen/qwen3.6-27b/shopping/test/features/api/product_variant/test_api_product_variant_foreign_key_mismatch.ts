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
 * Tests the business rule where a product variant's product_id foreign key must match the productId path parameter to enforce RESTful ownership hierarchy.
 *
 * Validates that attempting to retrieve a product variant using a productId that does not match the variant's owning product. The system correctly returns HTTP 404 Not Found, enforcing the RESTful ownership hierarchy where variants can only be retrieved under their parent product scope. Even though the variant exists and belongs to a different product, the endpoint returns 404 indicating the resource cannot be found at the specified path.
 *
 * 1. Administrator authenticates and creates two product categories.
 * 2. A seller account registers with pending approval status.
 * 3. Administrator searches for and approves the seller application.
 * 4. The approved seller logs in and creates two products in different categories.
 * 5. A product variant is created on the second product with unique SKU code and option attributes.
 * 6. Attempting to retrieve the variant using the first product's ID results in 404 Not Found, validating foreign key mismatch enforcement.
 */
export async function test_api_product_variant_foreign_key_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string & tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  typia.assert(adminAuthorized);
  // 2. Create two product categories
  const firstCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<IEcommercePlatformCategory.ICreate>,
      },
    );
  typia.assert(firstCategory);
  const secondCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<IEcommercePlatformCategory.ICreate>,
      },
    );
  typia.assert(secondCategory);
  // 3. Seller registration with pending approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "1234";
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies DeepPartial<IEcommercePlatformSeller.IJoin>,
  });
  typia.assert(sellerAuthorized);
  // 4. Admin searches for and approves the seller application
  const requests =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          status: "pending" satisfies string | undefined,
        } satisfies IEcommercePlatformSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(requests);
  TestValidator.predicate("has pending requests", requests.data.length > 0);
  const approvalRequest = requests.data[0];
  const approved =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved" satisfies string | undefined,
        } satisfies IEcommercePlatformSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approved);
  // 5. Seller login
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginAuthorized = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommercePlatformSeller.ILogin,
    },
  );
  typia.assert(sellerLoginAuthorized);
  // 6. Create two products in different categories
  const firstProduct =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerLoginConnection,
      {
        body: {
          category_id: firstCategory.id,
        } satisfies DeepPartial<IEcommercePlatformProduct.ICreate>,
      },
    );
  typia.assert(firstProduct);
  const secondProduct =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerLoginConnection,
      {
        body: {
          category_id: secondCategory.id,
        } satisfies DeepPartial<IEcommercePlatformProduct.ICreate>,
      },
    );
  typia.assert(secondProduct);
  // 7. Create product variant on the second product
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: {
          productId: secondProduct.id,
        },
      },
    );
  typia.assert(variant);
  // 8. Attempt to retrieve variant using first product's ID - foreign key mismatch returns 404
  await TestValidator.httpError(
    "variant not found due to product ID foreign key mismatch enforces RESTful ownership hierarchy",
    404,
    async () => {
      await api.functional.ecommercePlatform.products.variants.at(
        sellerLoginConnection,
        {
          productId: firstProduct.id,
          variantId: variant.id,
        },
      );
    },
  );
}
