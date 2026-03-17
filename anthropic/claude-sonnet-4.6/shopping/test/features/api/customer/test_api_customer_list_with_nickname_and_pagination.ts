import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_list_with_nickname_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // =========================================================================
  // 1. Setup: Register admin
  // =========================================================================
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // =========================================================================
  // 2. Setup: Register 3 customers with distinct, known nicknames
  // =========================================================================
  const customerConn1: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConn1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: "Alice_Smith",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const customerConn2: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConn2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: "Alice_Johnson",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const customerConn3: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConn3, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: "Bob_Williams",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // =========================================================================
  // 3. Nickname Partial Match Test
  // =========================================================================
  const aliceResult = await api.functional.shoppingMall.admin.customers.index(
    adminConnection,
    {
      body: {
        nickname: "Alice",
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(aliceResult);
  // All returned nicknames must contain "Alice" (case-insensitive)
  TestValidator.predicate(
    "all nicknames contain Alice",
    aliceResult.data.every((c) => c.nickname.toLowerCase().includes("alice")),
  );
  // Bob_Williams should NOT appear
  TestValidator.predicate(
    "Bob_Williams not in Alice search results",
    aliceResult.data.every((c) => !c.nickname.toLowerCase().includes("bob")),
  );
  // pagination.records should match count of Alice customers (at least 2)
  TestValidator.predicate(
    "records count >= 2 for Alice filter",
    aliceResult.pagination.records >= 2,
  );
  // =========================================================================
  // 4. Sorting Tests
  // =========================================================================
  const sortNickname = "nickname" as string &
    tags.Pattern<"^(created_at|nickname)$">;
  const sortCreatedAt = "created_at" as string &
    tags.Pattern<"^(created_at|nickname)$">;
  const orderAsc = "asc" as string & tags.Pattern<"^(asc|desc)$">;
  const orderDesc = "desc" as string & tags.Pattern<"^(asc|desc)$">;
  // Sort by nickname ASC
  const sortedNicknameAsc =
    await api.functional.shoppingMall.admin.customers.index(adminConnection, {
      body: {
        sort: sortNickname,
        order: orderAsc,
      } satisfies IShoppingMallCustomer.IRequest,
    });
  typia.assert(sortedNicknameAsc);
  // Verify ascending nickname order
  for (let i = 0; i < sortedNicknameAsc.data.length - 1; i++) {
    TestValidator.predicate(
      `nickname asc order at index ${i}`,
      sortedNicknameAsc.data[i]!.nickname.toLowerCase() <=
        sortedNicknameAsc.data[i + 1]!.nickname.toLowerCase(),
    );
  }
  // Sort by nickname DESC
  const sortedNicknameDesc =
    await api.functional.shoppingMall.admin.customers.index(adminConnection, {
      body: {
        sort: sortNickname,
        order: orderDesc,
      } satisfies IShoppingMallCustomer.IRequest,
    });
  typia.assert(sortedNicknameDesc);
  // Verify descending nickname order
  for (let i = 0; i < sortedNicknameDesc.data.length - 1; i++) {
    TestValidator.predicate(
      `nickname desc order at index ${i}`,
      sortedNicknameDesc.data[i]!.nickname.toLowerCase() >=
        sortedNicknameDesc.data[i + 1]!.nickname.toLowerCase(),
    );
  }
  // Sort by created_at ASC
  const sortedCreatedAtAsc =
    await api.functional.shoppingMall.admin.customers.index(adminConnection, {
      body: {
        sort: sortCreatedAt,
        order: orderAsc,
      } satisfies IShoppingMallCustomer.IRequest,
    });
  typia.assert(sortedCreatedAtAsc);
  // Verify ascending created_at order
  for (let i = 0; i < sortedCreatedAtAsc.data.length - 1; i++) {
    TestValidator.predicate(
      `created_at asc order at index ${i}`,
      new Date(sortedCreatedAtAsc.data[i]!.createdAt).getTime() <=
        new Date(sortedCreatedAtAsc.data[i + 1]!.createdAt).getTime(),
    );
  }
  // =========================================================================
  // 5. Pagination Test
  // =========================================================================
  const limitOne = 1 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const pageOne = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const pageTwo = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const page1 = await api.functional.shoppingMall.admin.customers.index(
    adminConnection,
    {
      body: {
        page: pageOne,
        limit: limitOne,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(page1);
  // Verify exactly 1 record
  TestValidator.equals("page 1 has 1 record", page1.data.length, 1);
  // Verify pagination metadata
  TestValidator.equals("pagination.current = 1", page1.pagination.current, 1);
  TestValidator.equals("pagination.limit = 1", page1.pagination.limit, 1);
  // pagination.pages should equal pagination.records (since limit = 1)
  TestValidator.equals(
    "pages equals records when limit=1",
    page1.pagination.pages,
    page1.pagination.records,
  );
  // Page 2
  const page2 = await api.functional.shoppingMall.admin.customers.index(
    adminConnection,
    {
      body: {
        page: pageTwo,
        limit: limitOne,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(page2);
  // Verify page 2 returns a different customer than page 1
  TestValidator.predicate(
    "page 2 has different customer than page 1",
    page2.data.length === 0 || page2.data[0]!.id !== page1.data[0]!.id,
  );
  // =========================================================================
  // 6. Combined Filter + Pagination
  // =========================================================================
  const combinedResult =
    await api.functional.shoppingMall.admin.customers.index(adminConnection, {
      body: {
        nickname: "Alice",
        page: pageOne,
        limit: limitOne,
        sort: sortNickname,
        order: orderAsc,
      } satisfies IShoppingMallCustomer.IRequest,
    });
  typia.assert(combinedResult);
  // Verify exactly 1 record returned
  TestValidator.equals(
    "combined filter returns 1 record",
    combinedResult.data.length,
    1,
  );
  // Verify nickname contains "Alice"
  TestValidator.predicate(
    "combined result nickname contains Alice",
    combinedResult.data[0]!.nickname.toLowerCase().includes("alice"),
  );
  // Pagination metadata consistent
  TestValidator.equals(
    "combined pagination.current = 1",
    combinedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined pagination.limit = 1",
    combinedResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "combined records >= 1",
    combinedResult.pagination.records >= 1,
  );
}
