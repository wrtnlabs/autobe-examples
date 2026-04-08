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
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test product update ownership enforcement - validates that sellers cannot modify products belonging to other sellers.
 *
 * This test validates the ownership verification business rule that prevents sellers from modifying products they do not own. The system must return 403 Forbidden when a seller attempts to update another seller's product, protecting product integrity and seller data isolation.
 *
 * **Test Flow:**
 * 1. Administrator creates a product category for testing purposes.
 * 2. Seller A registers and authenticates on the platform.
 * 3. Seller B registers and authenticates on the platform.
 * 4. Seller A creates a new product listing under the created category.
 * 5. Seller B attempts to update Seller A's product (unauthorized operation).
 * 6. System rejects the request with 403 Forbidden error.
 *
 * **Validation Points:**
 * - Seller A successfully creates a product with proper category assignment.
 * - Seller B's update attempt is rejected with appropriate authorization error.
 * - The ownership verification correctly identifies the mismatch between authenticated seller and product owner.
 */
export async function test_api_product_update_ownership_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - Create admin connection and category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Register and authenticate Seller A
  const sellerACredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  await authorize_seller_join(adminConnection, { body: sellerACredentials });
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerAConnection, {
    body: {
      email: sellerACredentials.email,
      password: sellerACredentials.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Register and authenticate Seller B
  const sellerBCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  await authorize_seller_join(adminConnection, { body: sellerBCredentials });
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerBConnection, {
    body: {
      email: sellerBCredentials.email,
      password: sellerBCredentials.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Seller A creates a product
  const sellerAProduct =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerAConnection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  typia.assert(sellerAProduct);
  // 5. Seller B attempts to update Seller A's product - should be rejected with 403
  await TestValidator.httpError(
    "Seller B cannot update Seller A's product",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.products.putByProductid(
        sellerBConnection,
        {
          productId: sellerAProduct.id,
          body: {
            name: RandomGenerator.name(3),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            basePrice: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
            categoryId: category.id,
          } satisfies IEcommerceMallProduct.IUpdate,
        },
      );
    },
  );
}
