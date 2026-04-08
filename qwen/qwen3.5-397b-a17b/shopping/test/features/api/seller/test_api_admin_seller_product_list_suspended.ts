import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test admin product listing for suspended seller returns empty results.
 *
 * Validates that when a seller account is suspended by an administrator, all products owned by that seller are excluded from the admin product listing endpoint. This ensures business rules for seller suspension are consistently enforced across all product query endpoints, including admin-facing ones.
 *
 * The test creates a complete seller workflow: registration, admin approval, product creation with images and variants, then suspension. After suspension, the admin queries the seller's products and verifies the response contains zero records despite products existing in the database.
 *
 * 1. Administrator registers and authenticates via admin join endpoint.
 * 2. Seller registers account which starts in pending approval status.
 * 3. Admin approves seller account changing status to approved.
 * 4. Seller logs in with approved status to get fresh authentication token.
 * 5. Seller creates multiple products with complete setup including images and variants.
 * 6. Admin suspends seller account by setting approval_status to rejected.
 * 7. Admin queries suspended seller's products via admin endpoint.
 * 8. Validates response contains empty data array and zero pagination counts.
 */
export async function test_api_admin_seller_product_list_suspended(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  // 2. Seller registration (starts as pending)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Admin approves seller
  const approvedSeller = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId: (
        await api.functional.shoppingMall.auth.seller.login(connection, {
          body: {
            email: sellerEmail,
            password: sellerPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          },
        })
      ).id,
      body: {
        approval_status: "approved",
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approved",
    approvedSeller.approval_status,
    "approved",
  );
  // 4. Seller login after approval to get fresh token with approved status
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 5. Seller creates multiple products
  const productCount = 3;
  const products: IShoppingMallProduct[] = [];
  for (let i = 0; i < productCount; i++) {
    const product = await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
    typia.assert(product);
    products.push(product);
    // 6. Add images to product
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
          display_order: 0,
        },
      },
    );
    // 7. Add variants to product
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"] as const)}, Size: ${RandomGenerator.pick(["S", "M", "L"] as const)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  }
  // 8. Admin suspends seller (set to rejected status)
  const suspendedSeller =
    await api.functional.shoppingMall.admin.sellers.update(adminConnection, {
      sellerId: sellerId,
      body: {
        approval_status: "rejected",
        rejection_reason: "Test suspension for E2E validation",
      } satisfies IShoppingMallSeller.IUpdate,
    });
  typia.assert(suspendedSeller);
  TestValidator.equals(
    "seller suspended",
    suspendedSeller.approval_status,
    "rejected",
  );
  // 9. Admin queries suspended seller's products
  const productList =
    await api.functional.shoppingMall.admin.sellers.products.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(productList);
  // 10. Validate suspended seller products are excluded
  TestValidator.equals("data array empty", productList.data.length, 0);
  TestValidator.equals("records count zero", productList.pagination.records, 0);
  TestValidator.equals("pages count zero", productList.pagination.pages, 0);
  TestValidator.equals("current page", productList.pagination.current, 1);
  TestValidator.equals("limit", productList.pagination.limit, 10);
}
