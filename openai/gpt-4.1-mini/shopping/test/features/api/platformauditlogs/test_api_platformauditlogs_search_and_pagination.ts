import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAuditLog";

export async function test_api_platformauditlogs_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const fullName = RandomGenerator.name();
  const password = "StrongPass123!";

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        full_name: fullName,
        password: password,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "Admin registration provides authorization token",
    admin.token !== null && admin.token !== undefined,
  );

  // 2. Admin login
  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: password,
        href: "https://test.admin/login",
        referrer: "https://test.admin/",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);
  TestValidator.predicate(
    "Admin login provides authorization token",
    loggedInAdmin.token !== null && loggedInAdmin.token !== undefined,
  );

  // 3. Paginated audit logs search

  const paginationTests = [
    { page: 1, limit: 5 },
    { page: 2, limit: 10 },
  ];

  for (const { page, limit } of paginationTests) {
    const pageResult: IPageIShoppingMallPlatformAuditLog.ISummary =
      await api.functional.shoppingMall.admin.platformAuditLogs.index(
        connection,
        {
          body: {
            pagination: {
              current: page,
              limit: limit,
              records: 0,
              pages: 0,
            },
            data: [],
          } satisfies IPageIShoppingMallPlatformAuditLog.IRequest,
        },
      );
    typia.assert(pageResult);

    const { pagination, data } = pageResult;

    TestValidator.predicate(
      `Page ${page} audit logs pagination current property is correct`,
      pagination.current === page,
    );
    TestValidator.predicate(
      `Page ${page} audit logs pagination limit property is correct`,
      pagination.limit === limit,
    );
    TestValidator.predicate(
      `Page ${page} audit logs pagination records property is >= 0`,
      pagination.records >= 0,
    );
    TestValidator.predicate(
      `Page ${page} audit logs pagination pages property is >= 0`,
      pagination.pages >= 0,
    );

    for (const audit of data) {
      typia.assert(audit);
      TestValidator.predicate(
        `Audit log id is UUID format for page ${page}`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          audit.id,
        ),
      );
      TestValidator.predicate(
        `Audit log shopping_mall_admin_id is UUID format for page ${page}`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          audit.shopping_mall_admin_id,
        ),
      );
      TestValidator.predicate(
        `Audit log event_type is non-empty string for page ${page}`,
        typeof audit.event_type === "string" && audit.event_type.length > 0,
      );
      TestValidator.predicate(
        `Audit log event_description is non-empty string for page ${page}`,
        typeof audit.event_description === "string" &&
          audit.event_description.length > 0,
      );
      TestValidator.predicate(
        `Audit log created_at is valid ISO 8601 date-time for page ${page}`,
        !isNaN(Date.parse(audit.created_at)),
      );
    }
  }

  // 4. Filtered audit logs search by event_type filter unsupported explicitly in schema
  // Perform standard pagination call without filter
  const filteredResult: IPageIShoppingMallPlatformAuditLog.ISummary =
    await api.functional.shoppingMall.admin.platformAuditLogs.index(
      connection,
      {
        body: {
          pagination: {
            current: 1,
            limit: 20,
            records: 0,
            pages: 0,
          },
          data: [],
        } satisfies IPageIShoppingMallPlatformAuditLog.IRequest,
      },
    );
  typia.assert(filteredResult);

  // We cannot assert all event_type equal as filter is not supported
  // Instead, validate event_type is a non-empty string for each audit log
  TestValidator.predicate(
    "All filtered audit logs have non-empty event_type",
    filteredResult.data.every(
      (audit) =>
        typeof audit.event_type === "string" && audit.event_type.length > 0,
    ),
  );

  TestValidator.predicate(
    "Filtered audit logs pagination current property is 1",
    filteredResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "Filtered audit logs pagination limit property is 20",
    filteredResult.pagination.limit === 20,
  );
  TestValidator.predicate(
    "Filtered audit logs pagination records property is >= 0",
    filteredResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Filtered audit logs pagination pages property is >= 0",
    filteredResult.pagination.pages >= 0,
  );
}
