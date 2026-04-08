import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_account_filter_by_search_and_status(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies administrator seller-account browsing with keyword search and approval-status filtering.
   *
   * This scenario validates the moderation list workflow for seller accounts by authenticating as an administrator,
   * requesting filtered seller-account pages, and confirming that pagination metadata and returned summaries are
   * consistent with the applied search and approval-status criteria.
   *
   * 1. Authenticate as an administrator on an isolated connection.
   * 2. Request seller-account browsing data using a keyword search and approval-status filter.
   * 3. Validate pagination metadata and ensure every row matches the requested criteria.
   * 4. If multiple pages exist, request another page with the same criteria and confirm consistency.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: "Password123!" satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const search = RandomGenerator.alphabets(6);
  const approvalStatus = RandomGenerator.pick(["pending", "rejected"] as const);
  const firstPage =
    await api.functional.mallPlatform.administrator.sellerAccounts.index(
      adminConnection,
      {
        body: {
          search,
          approvalStatus,
          page: 1,
          limit: 2,
        } satisfies IMallPlatformSellerAccount.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "pagination records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current page should be at least 1 when records exist",
    firstPage.pagination.records === 0 || firstPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination current page should not exceed total pages when pages exist",
    firstPage.pagination.pages === 0 ||
      firstPage.pagination.current <= firstPage.pagination.pages,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    firstPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "returned records should not exceed page limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "returned records should not exceed total matching records",
    firstPage.data.length <= firstPage.pagination.records,
  );
  for (const seller of firstPage.data) {
    TestValidator.equals(
      "seller approval status should match the requested filter",
      seller.approvalStatus,
      approvalStatus,
    );
  }
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.mallPlatform.administrator.sellerAccounts.index(
        adminConnection,
        {
          body: {
            search,
            approvalStatus,
            page: 2,
            limit: 2,
          } satisfies IMallPlatformSellerAccount.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "filter criteria should preserve pagination page size across pages",
      secondPage.pagination.limit,
      firstPage.pagination.limit,
    );
    TestValidator.equals(
      "search criteria should preserve approval-state consistency on subsequent pages",
      secondPage.data.every(
        (seller) => seller.approvalStatus === approvalStatus,
      ),
      true,
    );
    TestValidator.predicate(
      "subsequent page pagination should remain coherent",
      secondPage.pagination.records >= firstPage.pagination.records ||
        secondPage.pagination.pages >= firstPage.pagination.pages,
    );
  }
}
