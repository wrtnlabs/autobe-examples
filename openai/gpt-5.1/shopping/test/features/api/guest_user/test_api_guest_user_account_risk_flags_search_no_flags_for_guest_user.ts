import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAccountRiskFlag";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_guest_user_account_risk_flags_search_no_flags_for_guest_user(
  connection: api.IConnection,
) {
  // 1. Admin joins and becomes authenticated
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare a guestUserId that is syntactically valid (no specific format required)
  const guestUserId: string = typia.random<string>();

  // 3. Call the guest user risk flag search endpoint with minimal IRequest (page=1, limit=20)
  const pageValue = 1;
  const limitValue = 20;
  const requestBody = {
    page: pageValue,
    limit: limitValue,
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  const page: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.guestUsers.accountRiskFlags.index(
      connection,
      {
        guestUserId,
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallAccountRiskFlag.ISummary>(page);

  const pagination: IPage.IPagination = page.pagination;

  // 4. Validate pagination semantics for an empty result set
  TestValidator.equals(
    "pagination.current should reflect requested page",
    pagination.current,
    pageValue,
  );

  TestValidator.equals(
    "pagination.limit should reflect requested limit",
    pagination.limit,
    limitValue,
  );

  TestValidator.equals(
    "pagination.records should be zero when no flags exist",
    pagination.records,
    0,
  );

  TestValidator.equals(
    "pagination.pages should be zero when no flags exist",
    pagination.pages,
    0,
  );

  TestValidator.equals(
    "risk flag data list should be empty when no flags exist",
    page.data.length,
    0,
  );
}
