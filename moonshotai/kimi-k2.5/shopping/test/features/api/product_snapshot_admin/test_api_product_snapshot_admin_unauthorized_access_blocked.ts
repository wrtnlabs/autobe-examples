import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
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

export async function test_api_product_snapshot_admin_unauthorized_access_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate to create a category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create a category using admin connection
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/seller/join",
    referrer: "https://example.com/",
  };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerCredentials.email,
      password: sellerCredentials.password,
      href: sellerCredentials.href,
      referrer: sellerCredentials.referrer,
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 4. Create a product using seller connection
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      } satisfies Partial<IEcommerceMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  // 5. Test 1: Unauthenticated connection should get 403 Forbidden
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated access to product snapshots should return 403",
    403,
    async () => {
      await api.functional.ecommerceMall.admin.products.snapshots.index(
        unauthenticatedConnection,
        {
          productId: product.id,
          body: {
            createdAtFrom: null,
            createdAtTo: null,
            sort: "created_at_DESC" as const,
            limit: null,
            cursor: null,
            page: null,
          } satisfies IEcommerceMallProductSnapshot.IRequest,
        },
      );
    },
  );
  // 6. Test 2: Seller (product owner) should get 403 Forbidden (not admin)
  await TestValidator.httpError(
    "seller (product owner) accessing admin endpoint should return 403",
    403,
    async () => {
      await api.functional.ecommerceMall.admin.products.snapshots.index(
        sellerConnection,
        {
          productId: product.id,
          body: {
            createdAtFrom: null,
            createdAtTo: null,
            sort: "created_at_DESC" as const,
            limit: null,
            cursor: null,
            page: null,
          } satisfies IEcommerceMallProductSnapshot.IRequest,
        },
      );
    },
  );
  // 7. Verify admin CAN access successfully (baseline)
  const adminSnapshots =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          createdAtFrom: null,
          createdAtTo: null,
          sort: "created_at_DESC" as const,
          limit: null,
          cursor: null,
          page: null,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(adminSnapshots);
  TestValidator.predicate(
    "admin should successfully retrieve product snapshots",
    adminSnapshots !== null,
  );
}
