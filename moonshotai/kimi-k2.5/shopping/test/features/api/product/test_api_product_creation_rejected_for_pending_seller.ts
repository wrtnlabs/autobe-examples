import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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

export async function test_api_product_creation_rejected_for_pending_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a category first
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Test1234!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IEcommerceMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Home Appliances",
        description: "Category for home appliances and electronics",
      },
    },
  );
  typia.assert(category);
  // 2. Seller joins the platform - creates seller with 'pending' status
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinRequest: IEcommerceMallSeller.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Test1234!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const sellerResponse = await authorize_seller_join(sellerConnection, {
    body: sellerJoinRequest,
  });
  typia.assert(sellerResponse);
  // 3. DO NOT approve the seller registration
  // 4. Attempt to create a product as the pending seller
  const productBody: IEcommerceMallProduct.ICreate = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 4 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    categoryId: category.id,
    basePrice: 10000,
  };
  // 5. Verify the request is rejected with 403 Forbidden status
  await TestValidator.httpError(
    "pending seller cannot create products",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.products.create(
        sellerConnection,
        { body: productBody },
      );
    },
  );
}
