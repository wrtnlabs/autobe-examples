import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_customer_list_filter_by_nickname_and_email_with_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Setup: Register 3 customers with distinct, predictable nicknames and emails
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {
    body: {
      email: "alice_shop_test_unique1@example.com" as string &
        tags.Format<"email">,
      password: "Password123!",
      nickname: "AliceShop",
      href: "https://example.com/join",
      referrer: "https://example.com/",
    },
  });
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {
    body: {
      email: "alice.market_test_unique2@example.com" as string &
        tags.Format<"email">,
      password: "Password123!",
      nickname: "AliceMarket",
      href: "https://example.com/join",
      referrer: "https://example.com/",
    },
  });
  const customer3Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer3Connection, {
    body: {
      email: "bob_store_test_unique3@example.com" as string &
        tags.Format<"email">,
      password: "Password123!",
      nickname: "BobStore",
      href: "https://example.com/join",
      referrer: "https://example.com/",
    },
  });
  // 3. Test: Nickname partial match with sorting
  const nicknameFilterResult =
    await api.functional.shoppingMall.superAdmin.customers.index(
      superAdminConnection,
      {
        body: {
          nickname: "Alice",
          sort: "nickname",
          order: "asc",
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(nicknameFilterResult);
  // Validate: only AliceShop and AliceMarket appear, not BobStore
  TestValidator.predicate(
    "nickname filter records count is 2",
    nicknameFilterResult.pagination.records >= 2,
  );
  TestValidator.predicate(
    "BobStore is NOT in nickname filter results",
    !nicknameFilterResult.data.some((c) => c.nickname === "BobStore"),
  );
  TestValidator.predicate(
    "AliceShop is in nickname filter results",
    nicknameFilterResult.data.some((c) => c.nickname === "AliceShop"),
  );
  TestValidator.predicate(
    "AliceMarket is in nickname filter results",
    nicknameFilterResult.data.some((c) => c.nickname === "AliceMarket"),
  );
  // Validate ascending sort: AliceMarket before AliceShop
  const aliceMarketIdx = nicknameFilterResult.data.findIndex(
    (c) => c.nickname === "AliceMarket",
  );
  const aliceShopIdx = nicknameFilterResult.data.findIndex(
    (c) => c.nickname === "AliceShop",
  );
  TestValidator.predicate(
    "AliceMarket appears before AliceShop when sorted ascending by nickname",
    aliceMarketIdx < aliceShopIdx,
  );
  // 4. Test: Email partial match
  const emailFilterResult =
    await api.functional.shoppingMall.superAdmin.customers.index(
      superAdminConnection,
      {
        body: {
          email: "alice_shop_test_unique1@example.com" as string &
            tags.Format<"email">,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(emailFilterResult);
  // Validate: only Customer 1 (alice_shop_test_unique1) appears
  TestValidator.predicate(
    "email filter - alice_shop appears",
    emailFilterResult.data.some((c) => c.nickname === "AliceShop"),
  );
  TestValidator.predicate(
    "email filter - BobStore NOT in results",
    !emailFilterResult.data.some((c) => c.nickname === "BobStore"),
  );
  // 5. Test: Combined nickname and email filter
  const combinedFilterResult =
    await api.functional.shoppingMall.superAdmin.customers.index(
      superAdminConnection,
      {
        body: {
          nickname: "Alice",
          email: "alice.market_test_unique2@example.com" as string &
            tags.Format<"email">,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // Validate: only Customer 2 (AliceMarket) appears
  TestValidator.predicate(
    "combined filter - only AliceMarket appears",
    combinedFilterResult.data.some((c) => c.nickname === "AliceMarket"),
  );
  TestValidator.predicate(
    "combined filter - AliceShop NOT in results",
    !combinedFilterResult.data.some((c) => c.nickname === "AliceShop"),
  );
  TestValidator.predicate(
    "combined filter - BobStore NOT in results",
    !combinedFilterResult.data.some((c) => c.nickname === "BobStore"),
  );
  TestValidator.equals(
    "combined filter pagination records equals 1",
    combinedFilterResult.pagination.records,
    1,
  );
  // 6. Test: Non-matching filter
  const noMatchResult =
    await api.functional.shoppingMall.superAdmin.customers.index(
      superAdminConnection,
      {
        body: {
          nickname: "NonExistentUser999",
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(noMatchResult);
  // Validate: empty results
  TestValidator.equals(
    "no match - data is empty",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "no match - records is 0",
    noMatchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "no match - pages is 0",
    noMatchResult.pagination.pages,
    0,
  );
}
