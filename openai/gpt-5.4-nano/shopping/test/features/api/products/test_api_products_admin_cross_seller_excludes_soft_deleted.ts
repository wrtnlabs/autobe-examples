import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_products_admin_cross_seller_excludes_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // <SCENARIO DESCRIPTION HERE>
  // 1) Admin join + login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail =
    `admin_${RandomGenerator.alphaNumeric(10)}@test.com` satisfies string;
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2) Two sellers (members)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerAEmail =
    `sellerA_${RandomGenerator.alphaNumeric(10)}@test.com` satisfies string;
  const sellerAPassword = RandomGenerator.alphaNumeric(16);
  const sellerBEmail =
    `sellerB_${RandomGenerator.alphaNumeric(10)}@test.com` satisfies string;
  const sellerBPassword = RandomGenerator.alphaNumeric(16);
  const authorizedSellerA = await authorize_member_join(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  const authorizedSellerB = await authorize_member_join(sellerBConnection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  await authorize_member_login(sellerAConnection, {
    body: {
      email: authorizedSellerA.email,
      password: sellerAPassword,
    } satisfies IShoppingMallMember.ILogin,
  });
  await authorize_member_login(sellerBConnection, {
    body: {
      email: authorizedSellerB.email,
      password: sellerBPassword,
    } satisfies IShoppingMallMember.ILogin,
  });
  // 3) Create products across sellers
  const createOverrides =
    {} satisfies DeepPartial<IShoppingMallProduct.ICreate>;
  const productA1 =
    await generate_random_shopping_mall_member_products_create_product(
      sellerAConnection,
      { body: createOverrides },
    );
  const productA2 =
    await generate_random_shopping_mall_member_products_create_product(
      sellerAConnection,
      { body: createOverrides },
    );
  const productB1 =
    await generate_random_shopping_mall_member_products_create_product(
      sellerBConnection,
      { body: createOverrides },
    );
  const productB2 =
    await generate_random_shopping_mall_member_products_create_product(
      sellerBConnection,
      { body: createOverrides },
    );
  // 4) Soft-delete one product from seller A
  await api.functional.shoppingMall.member.products.erase(sellerAConnection, {
    productId: productA2.id,
  });
  // 5) Admin list across sellers
  const page = await api.functional.shoppingMall.member.products.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(page);
  const returnedIds = page.data.map((p) => p.id);
  TestValidator.predicate(
    "soft-deleted product is excluded",
    returnedIds.indexOf(productA2.id) === -1,
  );
  TestValidator.predicate(
    "includes non-deleted products across sellers",
    returnedIds.includes(productA1.id) &&
      (returnedIds.includes(productB1.id) ||
        returnedIds.includes(productB2.id)),
  );
  // Seller summaries should exist
  TestValidator.predicate(
    "each item has a seller summary",
    page.data.every((p) => p.seller !== null && p.seller !== undefined),
  );
  // Pagination metadata
  TestValidator.equals("pagination current", page.pagination.current, 1);
  TestValidator.predicate(
    "pagination records is at least number of created non-deleted products",
    page.pagination.records >= 3,
  );
  TestValidator.predicate(
    "pagination pages matches records and limit",
    page.pagination.pages ===
      Math.ceil(page.pagination.records / page.pagination.limit),
  );
  // 6) Edge: if we delete all created products, first page should be empty and stable
  await api.functional.shoppingMall.member.products.erase(sellerAConnection, {
    productId: productA1.id,
  });
  await api.functional.shoppingMall.member.products.erase(sellerBConnection, {
    productId: productB1.id,
  });
  await api.functional.shoppingMall.member.products.erase(sellerBConnection, {
    productId: productB2.id,
  });
  const emptyPage = await api.functional.shoppingMall.member.products.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals("empty page data", emptyPage.data.length, 0);
  TestValidator.equals("empty page pages", emptyPage.pagination.pages, 0);
}
