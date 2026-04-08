import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_update_permission_denied_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller 1 (product owner)
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {});
  typia.assert(seller1Auth);
  // Login as seller1 to get approved status
  const seller1Login: IEcommerceMallSeller.IAuthorized =
    await api.functional.ecommerceMall.auth.seller.login(seller1Connection, {
      body: {
        email: seller1Auth.email,
        password: seller1Auth.token.access.substring(0, 16),
      } satisfies IEcommerceMallSeller.ILogin,
    });
  typia.assert(seller1Login);
  // 2. Register seller 2 (non-owner who will attempt unauthorized update)
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {});
  typia.assert(seller2Auth);
  // Login as seller2
  const seller2Login: IEcommerceMallSeller.IAuthorized =
    await api.functional.ecommerceMall.auth.seller.login(seller2Connection, {
      body: {
        email: seller2Auth.email,
        password: seller2Auth.token.access.substring(0, 16),
      } satisfies IEcommerceMallSeller.ILogin,
    });
  typia.assert(seller2Login);
  // 3. Create admin connection for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>() as string &
        tags.Format<"uri">,
      referrer: typia.random<string & tags.Format<"uri">>() as string &
        tags.Format<"uri">,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() as string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() as string &
        tags.Format<"uri">,
      referrer: typia.random<string & tags.Format<"uri">>() as string &
        tags.Format<"uri">,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 4. Create a category (required for product creation)
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 5. Seller 1 creates a product (only approved sellers can create products)
  // Note: If seller1 is pending, product creation will fail with auth error - this is expected
  // The key test is that seller2 cannot update seller1's product regardless of approval status
  const product = await generate_random_ecommerce_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        categoryId: category.id,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        name: RandomGenerator.name(2),
        basePrice: 10000,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Seller 2 attempts to update seller 1's product - should be denied
  await TestValidator.error(
    "non-owner cannot update another seller's product",
    async () => {
      await api.functional.ecommerceMall.seller.products.update(
        seller2Connection,
        {
          productId: product.id,
          body: {
            name: "Unauthorized Update Attempt",
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IEcommerceMallProduct.IUpdate,
        },
      );
    },
  );
}
