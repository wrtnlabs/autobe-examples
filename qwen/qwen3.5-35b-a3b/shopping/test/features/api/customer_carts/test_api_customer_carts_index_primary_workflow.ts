import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_carts_index_primary_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the system
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Retrieve cart items
  const response = await api.functional.ecommerceMall.customer.carts.index(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination has valid current page",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination has valid records",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages",
    response.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination pages calculation",
    response.pagination.pages,
    Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 4. Validate cart items structure and business rules
  for (const item of response.data) {
    typia.assert(item);
    // Validate cart item fields
    TestValidator.predicate(
      "cart item has valid id",
      /^[0-9a-f-]{36}$/i.test(item.id),
    );
    TestValidator.predicate("cart item has quantity", item.quantity >= 1);
    TestValidator.predicate("cart item has price", item.price >= 0);
    // Validate variant details
    typia.assert(item.variant);
    TestValidator.predicate(
      "variant has skuCode",
      item.variant.skuCode.length > 0 && item.variant.skuCode.length <= 50,
    );
    TestValidator.predicate(
      "variant has stockQuantity",
      item.variant.stockQuantity >= 0,
    );
    TestValidator.predicate(
      "variant has isActive",
      typeof item.variant.isActive === "boolean",
    );
    // Validate parent product reference
    typia.assert(item.variant.product);
    TestValidator.predicate(
      "product has id",
      item.variant.product.id !== undefined,
    );
    TestValidator.predicate(
      "product has name",
      item.variant.product.name.length > 0,
    );
    TestValidator.predicate(
      "product has base_price",
      item.variant.product.base_price >= 0,
    );
    // Validate availability computation based on stock vs quantity
    if (item.variant.stockQuantity >= item.quantity) {
      TestValidator.equals(
        "availability available when stock >= quantity",
        item.availability,
        "available",
      );
    } else if (item.variant.stockQuantity === 0) {
      TestValidator.equals(
        "availability out_of_stock when stock = 0",
        item.availability,
        "out_of_stock",
      );
    } else {
      TestValidator.equals(
        "availability low_stock when stock > 0 AND stock < quantity",
        item.availability,
        "low_stock",
      );
    }
    // Validate price is preserved snapshot (not necessarily matching variant display price)
    TestValidator.predicate(
      "cart item price is valid number",
      typeof item.price === "number",
    );
  }
}
