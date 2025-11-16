import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuthLog";
import type { IShoppingMallAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthLog";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

export async function test_api_platform_admin_auth_logs_time_range_and_pagination_edges(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain authenticated context
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shopping-mall.test/join",
    referrer: "https://admin.shopping-mall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorized);

  // 2. Capture base timestamp T0 just before generating events
  const t0: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  // 3. Generate multiple auth-related events within a short window
  // 3-1. Generate multiple platform admin login events
  const adminLoginBodyBase = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shopping-mall.test/login",
    referrer: "https://admin.shopping-mall.test/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLoginAttempts = 3;
  for (let i = 0; i < adminLoginAttempts; i++) {
    const loginBody = {
      ...adminLoginBodyBase,
      href: `https://admin.shopping-mall.test/login?attempt=${i + 1}`,
    } satisfies IShoppingMallPlatformAdminLogin.IRequest;

    const loginResult: IShoppingMallPlatformAdmin.IAuthorized =
      await api.functional.auth.platformAdmin.login(connection, {
        body: loginBody,
      });
    typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(loginResult);
  }

  // 3-2. Generate customer password reset requests (these may create auth logs)
  const resetRequestCount = 3;
  for (let i = 0; i < resetRequestCount; i++) {
    const resetBody = {
      email: typia.random<string & tags.Format<"email">>(),
    } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;
    const resetResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
      await api.functional.auth.customer.password.reset.request.requestPasswordReset(
        connection,
        {
          body: resetBody,
        },
      );
    typia.assert<IShoppingMallCustomerAuth.IRequestPasswordResetResult>(
      resetResult,
    );
  }

  // Short delay window is implicit; assume events above have created logs.

  // 4. Compute created_from and created_to around the generated events
  const createdFrom: string & tags.Format<"date-time"> = t0;
  const createdTo: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  // 5. Call authLogs with page = 0 and small limit
  const limit: number & tags.Type<"int32"> = 2 as number & tags.Type<"int32">;
  const page0RequestBody = {
    page: 0 as number & tags.Type<"int32">,
    limit,
    sort_by: null,
    sort_direction: null,
    actor_type: null,
    actor_id: null,
    event_types: undefined,
    success: null,
    failure_reasons: undefined,
    ip: null,
    user_agent: null,
    created_from: createdFrom,
    created_to: createdTo,
  } satisfies IShoppingMallAuthLog.IRequest;

  const page0: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.authLogs.index(connection, {
      body: page0RequestBody,
    });
  typia.assert<IPageIShoppingMallAuthLog.ISummary>(page0);

  const pagination0 = page0.pagination;
  const data0 = page0.data;

  // Basic assertions for page 0
  TestValidator.predicate(
    "page0 pagination current should be 0",
    pagination0.current === 0,
  );
  TestValidator.predicate(
    "page0 pagination limit should be positive",
    pagination0.limit > 0,
  );
  TestValidator.predicate(
    "page0 data length must be <= pagination.limit",
    data0.length <= pagination0.limit,
  );

  // All occurredAt values should be within [created_from, created_to]
  for (const log of data0) {
    const occurred = new Date(log.occurredAt).getTime();
    const from = new Date(createdFrom).getTime();
    const to = new Date(createdTo).getTime();
    TestValidator.predicate(
      "log.occurredAt in page0 within [created_from, created_to]",
      occurred >= from && occurred <= to,
    );
  }

  // 7. Call authLogs again with page = 1
  const page1RequestBody = {
    ...page0RequestBody,
    page: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallAuthLog.IRequest;

  const page1: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.authLogs.index(connection, {
      body: page1RequestBody,
    });
  typia.assert<IPageIShoppingMallAuthLog.ISummary>(page1);

  const pagination1 = page1.pagination;
  const data1 = page1.data;

  TestValidator.predicate(
    "page1 pagination current should be 1 when requesting page 1",
    pagination1.current === 1,
  );
  TestValidator.predicate(
    "page1 data length must be <= pagination1.limit",
    data1.length <= pagination1.limit,
  );

  // If both pages have data, ensure no overlapping IDs
  if (data0.length > 0 && data1.length > 0) {
    const ids0 = new Set(data0.map((log) => log.id));
    const overlap = data1.some((log) => ids0.has(log.id));
    TestValidator.predicate(
      "page0 and page1 auth logs should not overlap",
      overlap === false,
    );
  }

  // 8. Request a page beyond the last page (if there are records)
  if (pagination0.records > 0 && pagination0.pages > 0) {
    const outOfRangePageIndex = (pagination0.pages + 1) as number &
      tags.Type<"int32">;
    const outRequestBody = {
      ...page0RequestBody,
      page: outOfRangePageIndex,
    } satisfies IShoppingMallAuthLog.IRequest;

    const outPage: IPageIShoppingMallAuthLog.ISummary =
      await api.functional.shoppingMall.platformAdmin.authLogs.index(
        connection,
        { body: outRequestBody },
      );
    typia.assert<IPageIShoppingMallAuthLog.ISummary>(outPage);

    TestValidator.predicate(
      "out-of-range page should return empty data array",
      outPage.data.length === 0,
    );
    TestValidator.equals(
      "out-of-range page records should match original records",
      outPage.pagination.records,
      pagination0.records,
    );
  }

  // 9. created_from later than created_to should yield an empty result set
  const invertedRangeBody = {
    ...page0RequestBody,
    page: 0 as number & tags.Type<"int32">,
    created_from: createdTo,
    created_to: createdFrom,
  } satisfies IShoppingMallAuthLog.IRequest;

  const invertedPage: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.authLogs.index(connection, {
      body: invertedRangeBody,
    });
  typia.assert<IPageIShoppingMallAuthLog.ISummary>(invertedPage);

  TestValidator.predicate(
    "inverted range should produce zero records",
    invertedPage.pagination.records === 0,
  );
  TestValidator.predicate(
    "inverted range should have zero pages",
    invertedPage.pagination.pages === 0,
  );
  TestValidator.predicate(
    "inverted range should return empty data array",
    invertedPage.data.length === 0,
  );
}
