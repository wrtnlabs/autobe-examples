import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_index_superuser_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    });
  typia.assert(superAdmin);
  // Create connection for index request with super admin token
  const indexConnection: api.IConnection = { host: connection.host };
  indexConnection.headers = { Authorization: superAdmin.token.access };
  // 2. Test basic retrieval with minimal request
  const basicResponse: IPageIEcommerceMallAdmin.ISummary =
    await api.functional.ecommerceMall.admin.admins.index(indexConnection, {
      body: {} satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(basicResponse);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination present",
    basicResponse.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "pagination current valid",
    () => basicResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit valid",
    () => basicResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records valid",
    () => basicResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages valid",
    () => basicResponse.pagination.pages >= 0,
  );
  // 4. Validate required fields in admin summary
  if (basicResponse.data.length > 0) {
    const firstAdmin: IEcommerceMallAdmin.ISummary = basicResponse.data[0];
    typia.assert(firstAdmin);
    TestValidator.equals("admin id exists", firstAdmin.id !== undefined, true);
    TestValidator.equals(
      "admin email exists",
      firstAdmin.email !== undefined,
      true,
    );
    TestValidator.equals(
      "admin is_banned exists",
      typeof firstAdmin.is_banned === "boolean",
      true,
    );
    TestValidator.equals(
      "admin created_at exists",
      firstAdmin.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "admin updated_at exists",
      firstAdmin.updated_at !== undefined,
      true,
    );
  }
  // 5. Test email filter
  const firstEmail: string =
    basicResponse.data.length > 0
      ? basicResponse.data[0].email
      : typia.random<string & tags.Format<"email">>();
  const emailSubstring: string = firstEmail.substring(
    0,
    Math.max(3, firstEmail.length - 2),
  );
  const emailFilterResponse: IPageIEcommerceMallAdmin.ISummary =
    await api.functional.ecommerceMall.admin.admins.index(indexConnection, {
      body: {
        email: emailSubstring,
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(emailFilterResponse);
  // Validate email filter returns matching results
  if (emailFilterResponse.data.length > 0) {
    const hasMatchingEmail: boolean = emailFilterResponse.data.every((admin) =>
      admin.email.includes(emailSubstring),
    );
    TestValidator.predicate(
      "email filter returns matching results",
      hasMatchingEmail,
    );
  }
  // 6. Test ban status filter
  const bannedStatus: boolean =
    basicResponse.data.length > 0 ? basicResponse.data[0].is_banned : false;
  const banFilterResponse: IPageIEcommerceMallAdmin.ISummary =
    await api.functional.ecommerceMall.admin.admins.index(indexConnection, {
      body: {
        is_banned: bannedStatus,
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(banFilterResponse);
  // Validate filtered results match ban status
  const hasCorrectBanStatus: boolean = banFilterResponse.data.every(
    (admin) => admin.is_banned === bannedStatus,
  );
  TestValidator.predicate("ban filter works correctly", hasCorrectBanStatus);
  // 7. Test date range filtering
  const now: string = new Date().toISOString();
  const oneDayAgo: string = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateFilterResponse: IPageIEcommerceMallAdmin.ISummary =
    await api.functional.ecommerceMall.admin.admins.index(indexConnection, {
      body: {
        created_at_gte: oneDayAgo,
        created_at_lte: now,
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(dateFilterResponse);
  // 8. Test sorting ascending
  const sortAscResponse: IPageIEcommerceMallAdmin.ISummary =
    await api.functional.ecommerceMall.admin.admins.index(indexConnection, {
      body: {
        sort_by: "id",
        sort_order: "asc",
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(sortAscResponse);
  // Validate ascending order
  if (sortAscResponse.data.length > 1) {
    let isAscending: boolean = true;
    for (let i = 1; i < sortAscResponse.data.length; i++) {
      if (sortAscResponse.data[i].id < sortAscResponse.data[i - 1].id) {
        isAscending = false;
        break;
      }
    }
    TestValidator.predicate("ascending sort works", isAscending);
  }
  // 9. Test sorting descending
  const sortDescResponse: IPageIEcommerceMallAdmin.ISummary =
    await api.functional.ecommerceMall.admin.admins.index(indexConnection, {
      body: {
        sort_by: "id",
        sort_order: "desc",
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(sortDescResponse);
  // Validate descending order
  if (sortDescResponse.data.length > 1) {
    let isDescending: boolean = true;
    for (let i = 1; i < sortDescResponse.data.length; i++) {
      if (sortDescResponse.data[i].id > sortDescResponse.data[i - 1].id) {
        isDescending = false;
        break;
      }
    }
    TestValidator.predicate("descending sort works", isDescending);
  }
  // 10. Test pagination - page 2
  const page2Response: IPageIEcommerceMallAdmin.ISummary =
    await api.functional.ecommerceMall.admin.admins.index(indexConnection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 response current",
    page2Response.pagination.current,
    2,
  );
  // 11. Test limit maximum (100)
  const maxLimitResponse: IPageIEcommerceMallAdmin.ISummary =
    await api.functional.ecommerceMall.admin.admins.index(indexConnection, {
      body: {
        limit: 100,
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(maxLimitResponse);
  TestValidator.predicate(
    "limit max respected",
    () => maxLimitResponse.pagination.limit <= 100,
  );
  // 12. Verify total records calculation consistency
  const expectedPages: number = Math.ceil(
    basicResponse.pagination.records / basicResponse.pagination.limit,
  );
  TestValidator.equals(
    "total pages calculated correctly",
    basicResponse.pagination.pages,
    expectedPages,
  );
}