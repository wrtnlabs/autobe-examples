import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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

export async function test_api_product_browsing_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Test sort_by=name with sort_order=asc (A-Z alphabetical order)
  const nameAscResponse = await api.functional.ecommerceMall.products.index(
    customerConnection,
    {
      body: {
        sort_by: "name",
        sort_order: "asc",
        page_size: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(nameAscResponse);
  // Validate alphabetical ascending order
  const nameAscProducts = nameAscResponse.data;
  for (let i = 1; i < nameAscProducts.length; i++) {
    TestValidator.predicate(
      "name ascending order",
      nameAscProducts[i - 1].name <= nameAscProducts[i].name,
    );
  }
  // 3. Test sort_by=base_price with sort_order=desc (highest price first)
  const priceDescResponse = await api.functional.ecommerceMall.products.index(
    customerConnection,
    {
      body: {
        sort_by: "base_price",
        sort_order: "desc",
        page_size: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceDescResponse);
  // Validate descending price order
  const priceDescProducts = priceDescResponse.data;
  for (let i = 1; i < priceDescProducts.length; i++) {
    TestValidator.predicate(
      "price descending order",
      priceDescProducts[i - 1].base_price >= priceDescProducts[i].base_price,
    );
  }
  // 4. Test sort_by=created_at with sort_order=desc (newest first)
  const createdAtDescResponse =
    await api.functional.ecommerceMall.products.index(customerConnection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page_size: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(createdAtDescResponse);
  // Validate created_at descending order (using timestamps)
  const createdAtDescProducts = createdAtDescResponse.data;
  for (let i = 1; i < createdAtDescProducts.length; i++) {
    TestValidator.predicate(
      "created_at descending order",
      new Date(createdAtDescProducts[i - 1].created_at).getTime() >=
        new Date(createdAtDescProducts[i].created_at).getTime(),
    );
  }
  // 5. Verify default sort (created_at DESC) when no parameters specified
  const defaultSortResponse = await api.functional.ecommerceMall.products.index(
    customerConnection,
    {
      body: {
        page_size: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(defaultSortResponse);
  // Validate default is created_at DESC
  const defaultSortProducts = defaultSortResponse.data;
  for (let i = 1; i < defaultSortProducts.length; i++) {
    TestValidator.predicate(
      "default sort created_at descending",
      new Date(defaultSortProducts[i - 1].created_at).getTime() >=
        new Date(defaultSortProducts[i].created_at).getTime(),
    );
  }
}