import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentNotification";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentNotification";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_notifications_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to access payment notification filtering endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Test default pagination (page 1, limit 25)
  const defaultPage =
    await api.functional.shoppingMall.admin.payment_notifications.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 25,
        } satisfies IShoppingMallPaymentNotification.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page number",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals("default limit", defaultPage.pagination.limit, 25);
  TestValidator.predicate(
    "default records greater than or equal to 0",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default pages greater than or equal to 1",
    defaultPage.pagination.pages >= 1,
  );
  // Step 3: Test pagination with custom parameters
  const page1 =
    await api.functional.shoppingMall.admin.payment_notifications.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPaymentNotification.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 number", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  const page2 =
    await api.functional.shoppingMall.admin.payment_notifications.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallPaymentNotification.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 number", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  // Step 4: Validate no overlapping data between pages
  const page1Ids = page1.data.map((item) => item.id);
  const page2Ids = page2.data.map((item) => item.id);
  const overlap = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate("no overlapping data between pages", !overlap);
  // Step 5: Test pagination beyond available data
  const beyondPage =
    await api.functional.shoppingMall.admin.payment_notifications.index(
      adminConnection,
      {
        body: {
          page: 999999,
          limit: 10,
        } satisfies IShoppingMallPaymentNotification.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals(
    "beyond page number",
    beyondPage.pagination.current,
    999999,
  );
  TestValidator.equals("beyond page limit", beyondPage.pagination.limit, 10);
  TestValidator.equals(
    "beyond page records",
    beyondPage.pagination.records,
    page1.pagination.records,
  ); // Same total records
  TestValidator.predicate(
    "beyond page has no data",
    beyondPage.data.length === 0,
  );
  // Step 6: Test edge case: limit 1
  const singleItemPage =
    await api.functional.shoppingMall.admin.payment_notifications.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallPaymentNotification.IRequest,
      },
    );
  typia.assert(singleItemPage);
  TestValidator.equals(
    "single item page limit",
    singleItemPage.pagination.limit,
    1,
  );
  TestValidator.equals(
    "single item page data count",
    singleItemPage.data.length,
    1,
  );
}