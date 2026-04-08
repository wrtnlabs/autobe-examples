import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_admin_admin_sellers_suspend } from "../../../generate/generate_random_ecommerce_mall_admin_admin_sellers_suspend";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

/**
 * Test that a suspended seller cannot create products and receives 403 Forbidden.
 *
 * Validates the platform's enforcement of seller suspension policies by verifying that
 * suspended sellers are completely blocked from product creation operations. The test
 * follows a complete workflow: administrator creates category, seller registers and gets
 * approved, administrator suspends the seller, then the suspended seller attempts to create
 * a product.
 *
 * This test ensures business rule enforcement where suspended sellers cannot list new
 * products, protecting platform integrity and ensuring policy compliance. The suspension
 * status must be properly enforced at the API level with appropriate 403 responses.
 *
 * 1. Administrator joins and authenticates on the platform.
 * 2. Administrator creates a product category for testing.
 * 3. Seller joins the platform with valid credentials.
 * 4. Administrator approves the seller registration.
 * 5. Administrator suspends the approved seller for policy violation.
 * 6. Suspended seller authenticates with their credentials.
 * 7. Attempt to create a new product - expected to fail with 403 Forbidden.
 * 8. Validates error response indicates seller account is suspended.
 */
export async function test_api_product_creation_rejected_for_suspended_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Admin creates a product category
  const category: IEcommerceMallCategory =
    await api.functional.ecommerceMall.admin.admin.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // 3. Seller joins the platform
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = "1234";
  await authorize_seller_join(adminConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Authenticate as seller to get seller ID
  const sellerAuthConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IEcommerceMallSeller.IAuthorized =
    await api.functional.ecommerceMall.auth.seller.login(sellerAuthConnection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.ILogin,
    });
  typia.assert(sellerAuth);
  // 4. Admin approves the seller
  const approvedSeller: IEcommerceMallSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      {
        sellerId: sellerAuth.id,
      },
    );
  typia.assert(approvedSeller);
  // 5. Admin suspends the seller
  const suspension: IEcommerceMallSellerSuspension =
    await api.functional.ecommerceMall.admin.admin.sellers.suspend(
      adminConnection,
      {
        sellerId: sellerAuth.id,
        body: {
          reason: "Policy violation: selling prohibited items",
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  typia.assert(suspension);
  // 6. Authenticate as the suspended seller
  const suspendedSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(suspendedSellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 7. Attempt to create product as suspended seller - should fail with 403
  await TestValidator.httpError(
    "Suspended seller cannot create products",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.products.create(
        suspendedSellerConnection,
        {
          body: {
            name: "Blocked Product",
            description: "This product cannot be created by suspended seller",
            categoryId: category.id,
            basePrice: 149.99,
          } satisfies IEcommerceMallProduct.ICreate,
        },
      );
    },
  );
}
