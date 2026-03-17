import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_address_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Test pagination with limit=5, page=1
  const page1 = await api.functional.ecommerceMall.customer.addresses.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IEcommerceMallAddress.IRequest,
    },
  );
  typia.assert(page1);
  // 3. Verify pagination metadata structure
  TestValidator.predicate(
    "pagination current is number",
    typeof page1.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit is number",
    typeof page1.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records is number",
    typeof page1.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages is number",
    typeof page1.pagination.pages === "number",
  );
  TestValidator.predicate("data is array", Array.isArray(page1.data));
  // 4. Test pagination with limit=5, page=2
  const page2 = await api.functional.ecommerceMall.customer.addresses.index(
    customerConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IEcommerceMallAddress.IRequest,
    },
  );
  typia.assert(page2);
  // 5. Verify pagination metadata for page 2
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  // 6. Test pagination with limit=100 (maximum)
  const maxPage = await api.functional.ecommerceMall.customer.addresses.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IEcommerceMallAddress.IRequest,
    },
  );
  typia.assert(maxPage);
  // 7. Verify max limit pagination
  TestValidator.equals(
    "max limit pagination current",
    maxPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "max limit pagination limit",
    maxPage.pagination.limit,
    100,
  );
  // 8. Test boundary case: page beyond available pages
  const beyondPage =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 100,
          limit: 5,
        } satisfies IEcommerceMallAddress.IRequest,
      },
    );
  typia.assert(beyondPage);
  // 9. Verify beyond page returns empty data
  TestValidator.equals(
    "beyond page returns empty data",
    beyondPage.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page current page",
    beyondPage.pagination.current,
    100,
  );
  // 10. Test with no pagination parameters (defaults)
  const defaultPage =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultPage);
  // 11. Verify default pagination
  TestValidator.predicate(
    "default pagination has current",
    defaultPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default pagination has records",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default pagination has pages",
    defaultPage.pagination.pages >= 0,
  );
}
