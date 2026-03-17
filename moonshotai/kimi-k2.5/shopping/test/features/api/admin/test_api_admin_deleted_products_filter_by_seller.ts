import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_admin_deleted_products_filter_by_seller(
  connection: api.IConnection,
) {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies Partial<IEcommerceMallAdmin.IJoin>,
  });
  // Create seller A connection
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
    } satisfies Partial<IEcommerceMallSeller.IJoin>,
  });
  // Submit seller A registration
  const sellerARegistration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerAConnection,
      {},
    );
  typia.assert(sellerARegistration);
  // Approve seller A registration
  await api.functional.ecommerceMall.admin.sellers.registrations.review(
    adminConnection,
    {
      registrationId: (sellerARegistration as any).id,
      body: {
        status: "approved",
        rejection_reason: null,
      } satisfies IEcommerceMallSellerRegistration.IReview,
    },
  );
  // Create seller B connection
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
    } satisfies Partial<IEcommerceMallSeller.IJoin>,
  });
  // Submit seller B registration
  const sellerBRegistration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerBConnection,
      {},
    );
  typia.assert(sellerBRegistration);
  // Approve seller B registration
  await api.functional.ecommerceMall.admin.sellers.registrations.review(
    adminConnection,
    {
      registrationId: (sellerBRegistration as any).id,
      body: {
        status: "approved",
        rejection_reason: null,
      } satisfies IEcommerceMallSellerRegistration.IReview,
    },
  );
  // Get seller A info
  const sellerAInfo = await api.functional.ecommerceMall.auth.seller.login(
    { host: connection.host },
    {
      body: {
        email: sellerAEmail,
        password: sellerAPassword,
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(sellerAInfo);
  const sellerAId = sellerAInfo.id;
  // Get seller B info
  const sellerBInfo = await api.functional.ecommerceMall.auth.seller.login(
    { host: connection.host },
    {
      body: {
        email: sellerBEmail,
        password: sellerBPassword,
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(sellerBInfo);
  const sellerBId = sellerBInfo.id;
  // Create product as seller A
  const productA = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(productA);
  // Create product as seller B
  const productB = await generate_random_ecommerce_mall_seller_products_create(
    sellerBConnection,
    {},
  );
  typia.assert(productB);
  // Delete product A as admin
  await api.functional.ecommerceMall.admin.products.erase(adminConnection, {
    productId: productA.id,
  });
  // Delete product B as admin
  await api.functional.ecommerceMall.admin.products.erase(adminConnection, {
    productId: productB.id,
  });
  // Filter deleted products by seller A ID
  const filteredDeletedProducts =
    await api.functional.ecommerceMall.admin.products.deleted.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(filteredDeletedProducts);
  // Verify response contains deleted products
  TestValidator.predicate(
    "filtered results should have data",
    filteredDeletedProducts.data.length >= 2,
  );
  // Verify product A is in the list
  const foundProductA = filteredDeletedProducts.data.some(
    (p) => p.id === productA.id,
  );
  TestValidator.predicate(
    "deleted products list should contain product A",
    foundProductA,
  );
  // Verify product B is in the list
  const foundProductB = filteredDeletedProducts.data.some(
    (p) => p.id === productB.id,
  );
  TestValidator.predicate(
    "deleted products list should contain product B",
    foundProductB,
  );
  // Re-login admin to refresh
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Filter by seller A only
  const sellerAFilteredProducts =
    await api.functional.ecommerceMall.admin.products.deleted.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          name: productA.name,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(sellerAFilteredProducts);
  // Verify seller A's deleted product is in the results
  const sellerAProductFound = sellerAFilteredProducts.data.some(
    (p) => p.id === productA.id,
  );
  TestValidator.predicate(
    "seller A filtered results should contain product A",
    sellerAProductFound,
  );
}
