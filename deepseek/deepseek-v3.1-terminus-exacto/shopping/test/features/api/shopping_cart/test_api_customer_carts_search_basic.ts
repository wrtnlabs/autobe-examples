import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_carts_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 2,
        wordMax: 4,
      }).substring(0, 50),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Search carts without filters (basic search)
  const searchResult = await api.functional.ecommerce.customer.carts.index(
    customerConnection,
    {
      body: {
        // No filters applied for basic search - empty request object
      } satisfies IEcommerceShoppingCart.IRequest,
    },
  );
  typia.assert(searchResult);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination exists",
    searchResult.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "current page valid",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate("limit valid", searchResult.pagination.limit >= 0);
  TestValidator.predicate(
    "records valid",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate("pages valid", searchResult.pagination.pages >= 0);
  // 4. Validate each cart item belongs to authenticated customer (business logic validation)
  if (searchResult.data.length > 0) {
    for (const cart of searchResult.data) {
      // Only business logic validation - ownership check
      TestValidator.equals(
        "cart belongs to authenticated customer",
        cart.customer_id,
        customerAuth.id,
      );
    }
  }
  // 5. Validate data-pagination consistency (business logic)
  TestValidator.predicate(
    "data length consistent with limit",
    searchResult.data.length <= searchResult.pagination.limit,
  );
  TestValidator.predicate(
    "records count consistent",
    searchResult.data.length <= searchResult.pagination.records,
  );
}
