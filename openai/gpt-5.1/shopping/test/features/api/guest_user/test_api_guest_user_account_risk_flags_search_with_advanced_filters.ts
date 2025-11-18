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

export async function test_api_guest_user_account_risk_flags_search_with_advanced_filters(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap via join
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Choose a target guestUserId
  const guestUserId: string = typia.random<string>();

  // 3. First search with advanced filters expected to return records
  const createdFrom: string & tags.Format<"date-time"> = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString() as string & tags.Format<"date-time">; // 30 days ago
  const createdTo: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const firstRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: "created_at",
    order_direction: "desc",
    actor_type: "guestuser",
    severity: "high",
    active: true,
    created_from: createdFrom,
    created_to: createdTo,
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  const firstPage: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.guestUsers.accountRiskFlags.index(
      connection,
      {
        guestUserId,
        body: firstRequestBody,
      },
    );
  typia.assert(firstPage);

  const firstPagination = firstPage.pagination;

  // Validate pagination metadata
  TestValidator.equals(
    "first search - current page matches request",
    firstPagination.current,
    1,
  );
  TestValidator.equals(
    "first search - limit matches request",
    firstPagination.limit,
    10,
  );
  TestValidator.predicate(
    "first search - records greater or equal to data length",
    firstPagination.records >= (firstPage.data?.length ?? 0),
  );

  if (firstPagination.records === 0) {
    TestValidator.equals(
      "first search - zero records implies zero pages",
      firstPagination.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "first search - positive records implies at least one page",
      firstPagination.pages >= 1,
    );
  }

  // Validate each record satisfies filters
  for (const flag of firstPage.data) {
    TestValidator.equals(
      "first search - actor_type must be guestuser",
      flag.actor_type,
      "guestuser",
    );
    TestValidator.equals(
      "first search - severity must be high",
      flag.severity,
      "high",
    );
    TestValidator.equals(
      "first search - active must be true",
      flag.active,
      true,
    );

    const createdAtTime = new Date(flag.created_at).getTime();
    const fromTime = new Date(createdFrom).getTime();
    const toTime = new Date(createdTo).getTime();

    TestValidator.predicate(
      "first search - created_at within requested range",
      createdAtTime >= fromTime && createdAtTime <= toTime,
    );
  }

  // 4. Second search with filters expected to return empty result set
  const secondRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: "created_at",
    order_direction: "desc",
    actor_type: "guestuser",
    severity: "low",
    active: false,
    created_from: createdFrom,
    created_to: createdTo,
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  const secondPage: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.guestUsers.accountRiskFlags.index(
      connection,
      {
        guestUserId,
        body: secondRequestBody,
      },
    );
  typia.assert(secondPage);

  const secondPagination = secondPage.pagination;

  TestValidator.equals(
    "second search - current page matches request",
    secondPagination.current,
    1,
  );
  TestValidator.equals(
    "second search - limit matches request",
    secondPagination.limit,
    10,
  );

  TestValidator.equals(
    "second search - no data should be returned for low severity inactive",
    secondPage.data.length,
    0,
  );

  TestValidator.equals(
    "second search - records should be zero when no data returned",
    secondPagination.records,
    0,
  );

  TestValidator.equals(
    "second search - pages should be zero when no records",
    secondPagination.pages,
    0,
  );
}
