import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentIntent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentIntent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentIntent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentIntent";
import type { IShoppingMallPaymentIntentMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentIntentMetadata";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_intent_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/signup",
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminData,
  });
  typia.assert(admin);
  // Step 2: Get first page of payment intents with limit=10
  const firstPage =
    await api.functional.shoppingMall.admin.payment_intents.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          currency: "KRW",
        } satisfies IShoppingMallPaymentIntent.IRequest,
      },
    );
  typia.assert(firstPage);
  // Step 3: Get second page of payment intents with limit=10
  const secondPage =
    await api.functional.shoppingMall.admin.payment_intents.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
          currency: "KRW",
        } satisfies IShoppingMallPaymentIntent.IRequest,
      },
    );
  typia.assert(secondPage);
  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "page 1 current should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit should be 10",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 1 records should be at least 10",
    firstPage.pagination.records >= 10,
  );
  TestValidator.predicate(
    "page 1 pages should be at least 1",
    firstPage.pagination.pages >= 1,
  );
  TestValidator.equals(
    "page 2 current should be 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit should be 10",
    secondPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 2 records should match page 1 records",
    secondPage.pagination.records === firstPage.pagination.records,
  );
  TestValidator.predicate(
    "page 2 pages should match page 1 pages",
    secondPage.pagination.pages === firstPage.pagination.pages,
  );
  // Step 5: Validate no overlap between page 1 and page 2
  const firstPageIds = firstPage.data.map((item) => item.id);
  const secondPageIds = secondPage.data.map((item) => item.id);
  const overlap = firstPageIds.filter((id) => secondPageIds.includes(id));
  TestValidator.equals(
    "page 1 and page 2 should have no overlap",
    overlap.length,
    0,
  );
  // Step 6: Validate second page has at least 1 record and no more than 10 records
  TestValidator.predicate(
    "page 2 should have at least 1 record",
    secondPage.data.length >= 1,
  );
  TestValidator.predicate(
    "page 2 should have at most 10 records",
    secondPage.data.length <= 10,
  );
}
