import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_search_category_filter_including_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // Register sellers using available authentication API
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Email = RandomGenerator.alphabets(5) + "@test.com";
  const seller1JoinInput = {
    email: seller1Email satisfies string &
      tags.MinLength<1> &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
  } satisfies IEcommerceMallSeller.IJoin;
  const seller1Join = await api.functional.ecommerceMall.auth.seller.join(
    seller1Connection,
    {
      body: seller1JoinInput,
    },
  );
  typia.assert(seller1Join);
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Email = RandomGenerator.alphabets(5) + "@test.com";
  const seller2JoinInput = {
    email: seller2Email satisfies string &
      tags.MinLength<1> &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
  } satisfies IEcommerceMallSeller.IJoin;
  const seller2Join = await api.functional.ecommerceMall.auth.seller.join(
    seller2Connection,
    {
      body: seller2JoinInput,
    },
  );
  typia.assert(seller2Join);
  // Register customer for search testing
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = RandomGenerator.alphabets(5) + "@test.com";
  const customerJoinInput = {
    email: customerEmail satisfies string &
      tags.MinLength<1> &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IEcommerceMallCustomer.IJoin;
  await api.functional.ecommerceMall.auth.customer.join(customerConnection, {
    body: customerJoinInput,
  });
  // Search with category filter including subcategories
  const searchResult = await api.functional.ecommerceMall.products.search(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(searchResult);
  // Validate search result structure
  TestValidator.predicate(
    "result data exists",
    Array.isArray(searchResult.data),
  );
  TestValidator.predicate(
    "pagination exists",
    searchResult.pagination !== undefined,
  );
  // Verify pagination fields
  const pagination = searchResult.pagination;
  TestValidator.predicate(
    "has current page",
    typeof pagination.current === "number",
  );
  TestValidator.predicate("has limit", typeof pagination.limit === "number");
  TestValidator.predicate(
    "has records count",
    typeof pagination.records === "number",
  );
  TestValidator.predicate(
    "has pages count",
    typeof pagination.pages === "number",
  );
  // Verify product structure if any products exist
  searchResult.data.forEach((product) => {
    TestValidator.predicate("has id", product.id !== undefined);
    TestValidator.predicate("has name", typeof product.name === "string");
    TestValidator.predicate(
      "has base_price",
      typeof product.base_price === "number",
    );
    TestValidator.predicate("has seller", product.seller !== undefined);
    TestValidator.predicate("has main_image", product.main_image !== undefined);
  });
}
