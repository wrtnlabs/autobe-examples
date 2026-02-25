import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_top_products_success(
  connection: api.IConnection,
): Promise<void> {
  // A customer successfully retrieves top-selling products in analytics dashboard
  // in paginated format (top 10 products based on sales volume from last 30 days)
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceCustomer.IJoin,
    });
  const response: IPageIEcommerceProduct.ISummary =
    await api.functional.ecommerce.customer.analytics.top_products.topProducts(
      customerConnection,
    );
  typia.assert(response);
  TestValidator.equals(
    "response should return top 10 products",
    response.pagination.limit,
    10,
  );
  TestValidator.equals(
    "response should have products",
    response.data.length,
    10,
  );
  for (const product of response.data) {
    TestValidator.equals(
      "product name should be provided",
      typeof product.name,
      "string",
    );
    TestValidator.predicate(
      "product price should be positive",
      product.base_price > 0,
    );
    TestValidator.equals(
      "product should have category",
      typeof product.category,
      "object",
    );
  }
}
