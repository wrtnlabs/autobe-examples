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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
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
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_seller_products_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register a new seller with random email and password
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.ecommerceMall.auth.seller.join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  // 3. Admin approves the seller
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.login(
    sellerConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: "https://example.com/login",
        referrer: "https://example.com/register",
      },
    },
  );
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    {
      sellerId: sellerAuth.id,
    },
  );
  // 4. Re-authenticate as approved seller with the same credentials
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.seller.login(
    approvedSellerConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: "https://example.com/login",
        referrer: "https://example.com/register",
      },
    },
  );
  // 5. Create multiple products for the approved seller
  const productCount = 5;
  await ArrayUtil.asyncRepeat(productCount, async () => {
    return await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      approvedSellerConnection,
      {},
    );
  });
  // 6. List products for the authenticated seller
  const productList =
    await api.functional.ecommerceMall.seller.sellers.me.products.list(
      approvedSellerConnection,
    );
  typia.assert(productList);
  // 7. Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    productList.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "records count is valid",
    productList.pagination.records >= productCount,
  );
  TestValidator.predicate(
    "pages count is valid",
    productList.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "current page is valid",
    productList.pagination.current >= 1,
  );
  TestValidator.predicate("limit is valid", productList.pagination.limit >= 1);
  // 8. Validate product data structure
  TestValidator.predicate("has data array", productList.data.length > 0);
  for (const product of productList.data) {
    // Validate required fields exist
    TestValidator.predicate(
      "product has id",
      product.id !== undefined && product.id !== null,
    );
    TestValidator.predicate(
      "product has name",
      product.name !== undefined && product.name !== null,
    );
    TestValidator.predicate(
      "product has basePrice",
      typeof product.basePrice === "number",
    );
    TestValidator.predicate(
      "product has categoryName",
      product.categoryName !== undefined && product.categoryName !== null,
    );
    TestValidator.predicate(
      "product has hasStock",
      typeof product.hasStock === "boolean",
    );
    TestValidator.predicate(
      "product has createdAt",
      product.createdAt !== undefined && product.createdAt !== null,
    );
    TestValidator.predicate(
      "product has updatedAt",
      product.updatedAt !== undefined && product.updatedAt !== null,
    );
    // Validate createdAt is a valid date-time format
    TestValidator.predicate(
      "createdAt is valid ISO date",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(product.createdAt),
    );
    TestValidator.predicate(
      "updatedAt is valid ISO date",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(product.updatedAt),
    );
    // hasStock is a computed boolean based on inventory
    TestValidator.predicate(
      "hasStock is boolean",
      typeof product.hasStock === "boolean",
    );
  }
  // 9. Validate ordering (descending by createdAt)
  for (let i = 1; i < productList.data.length; i++) {
    const prev = new Date(productList.data[i - 1].createdAt);
    const curr = new Date(productList.data[i].createdAt);
    TestValidator.predicate(
      "products ordered by createdAt descending",
      prev >= curr,
    );
  }
}
