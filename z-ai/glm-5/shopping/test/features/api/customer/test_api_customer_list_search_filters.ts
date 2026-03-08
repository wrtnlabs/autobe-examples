import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_list_search_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://admin.test.com/customers",
      referrer: "https://admin.test.com",
    },
  });
  // 2. Create test customers with varied data
  const customers = await ArrayUtil.asyncRepeat(10, async (index) => {
    const email = `user${index}@${RandomGenerator.alphabets(5)}.com`;
    const displayName =
      index % 3 === 0 ? null : `Test User ${RandomGenerator.name()}`;
    const phoneNumber = index % 2 === 0 ? RandomGenerator.mobile() : null;
    return await authorize_customer_join(
      { host: connection.host },
      {
        body: {
          email,
          password: "TestPassword123!",
          displayName,
          phoneNumber,
          href: "https://test.com/register",
          referrer: "https://test.com",
        },
      },
    );
  });
  // 3. Test email partial matching (case-insensitive)
  const emailSearchResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          email: "user1",
          limit: 100,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(emailSearchResult);
  TestValidator.predicate(
    "email partial match returns results",
    emailSearchResult.data.some((c) => c.email.includes("user1")),
  );
  // 4. Test display name search
  const customersWithDisplayName = customers.filter(
    (c) => c.displayName !== null,
  );
  if (customersWithDisplayName.length > 0) {
    const displayNameSearchResult =
      await api.functional.shoppingMall.administrator.customers.index(
        adminConnection,
        {
          body: {
            displayName: "Test",
            limit: 100,
          } satisfies IShoppingMallCustomer.IRequest,
        },
      );
    typia.assert(displayNameSearchResult);
    TestValidator.predicate(
      "display name search returns matching results",
      displayNameSearchResult.data.length > 0,
    );
  }
  // 5. Test phone number partial matching
  const customersWithPhone = customers.filter((c) => c.phoneNumber !== null);
  if (customersWithPhone.length > 0) {
    const phonePartial = customersWithPhone[0].phoneNumber!.substring(0, 5);
    const phoneSearchResult =
      await api.functional.shoppingMall.administrator.customers.index(
        adminConnection,
        {
          body: {
            phoneNumber: phonePartial,
            limit: 100,
          } satisfies IShoppingMallCustomer.IRequest,
        },
      );
    typia.assert(phoneSearchResult);
    TestValidator.predicate(
      "phone number partial match returns results",
      phoneSearchResult.data.some((c) => c.phoneNumber?.includes(phonePartial)),
    );
  }
  // 6. Test banned status filter (default should be non-banned)
  const bannedFilterResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          banned: false,
          limit: 100,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(bannedFilterResult);
  TestValidator.predicate(
    "banned filter returns only non-banned customers",
    bannedFilterResult.data.every((c) => c.banned === false),
  );
  // 7. Test created_at date range filter
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          createdAtFrom: oneHourAgo.toISOString(),
          createdAtTo: now.toISOString(),
          limit: 100,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns recently created customers",
    dateRangeResult.data.length > 0,
  );
  // 8. Test combined filters
  const combinedFilterResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          banned: false,
          createdAtFrom: oneHourAgo.toISOString(),
          limit: 100,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filters work correctly",
    combinedFilterResult.data.every((c) => c.banned === false),
  );
  // 9. Test sorting: created_at_desc (newest first)
  const sortDescResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          sort: "created_at_desc",
          limit: 100,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(sortDescResult);
  if (sortDescResult.data.length >= 2) {
    const dates = sortDescResult.data.map((c) =>
      new Date(c.createdAt).getTime(),
    );
    TestValidator.predicate(
      "created_at_desc sorts newest first",
      dates[0] >= dates[1],
    );
  }
  // 10. Test sorting: created_at_asc (oldest first)
  const sortAscResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          sort: "created_at_asc",
          limit: 100,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(sortAscResult);
  if (sortAscResult.data.length >= 2) {
    const dates = sortAscResult.data.map((c) =>
      new Date(c.createdAt).getTime(),
    );
    TestValidator.predicate(
      "created_at_asc sorts oldest first",
      dates[0] <= dates[1],
    );
  }
  // 11. Test sorting: email_asc (A-Z)
  const sortEmailAscResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          sort: "email_asc",
          limit: 100,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(sortEmailAscResult);
  if (sortEmailAscResult.data.length >= 2) {
    TestValidator.predicate(
      "email_asc sorts alphabetically A-Z",
      sortEmailAscResult.data[0].email.localeCompare(
        sortEmailAscResult.data[1].email,
      ) <= 0,
    );
  }
  // 12. Test sorting: email_desc (Z-A)
  const sortEmailDescResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          sort: "email_desc",
          limit: 100,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(sortEmailDescResult);
  if (sortEmailDescResult.data.length >= 2) {
    TestValidator.predicate(
      "email_desc sorts reverse alphabetically Z-A",
      sortEmailDescResult.data[0].email.localeCompare(
        sortEmailDescResult.data[1].email,
      ) >= 0,
    );
  }
  // 13. Test pagination
  const paginatedResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limit works",
    paginatedResult.data.length <= 5,
  );
  TestValidator.predicate(
    "pagination info is correct",
    paginatedResult.pagination.current === 1 &&
      paginatedResult.pagination.limit === 5,
  );
  // 14. Test general search field
  const generalSearchResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          search: "user",
          limit: 100,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(generalSearchResult);
  TestValidator.predicate(
    "general search returns matching results",
    generalSearchResult.data.length > 0,
  );
}
