import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_user_bans_basic_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create super administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSuperAdministrator.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Test Empty List Scenario with default pagination
  const emptyResponse =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      adminConnection,
      { body: {} satisfies IEcommerceMallUserBan.IRequest },
    );
  typia.assert(emptyResponse);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page is first",
    emptyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination default limit is 20",
    emptyResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    emptyResponse.pagination.records >= 0,
  );
  const expectedPages =
    emptyResponse.pagination.records === 0
      ? 0
      : Math.ceil(emptyResponse.pagination.records / 20);
  TestValidator.equals(
    "pagination pages calculated correctly",
    emptyResponse.pagination.pages,
    expectedPages,
  );
  TestValidator.equals(
    "data is array type",
    Array.isArray(emptyResponse.data),
    true,
  );
  // 3. Test Pagination Metadata Accuracy with custom limit
  const customPagingResponse =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      adminConnection,
      { body: { limit: 10, page: 1 } satisfies IEcommerceMallUserBan.IRequest },
    );
  typia.assert(customPagingResponse);
  TestValidator.equals(
    "custom pagination current page",
    customPagingResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom pagination limit is 10",
    customPagingResponse.pagination.limit,
    10,
  );
  const customExpectedPages =
    customPagingResponse.pagination.records === 0
      ? 0
      : Math.ceil(customPagingResponse.pagination.records / 10);
  TestValidator.equals(
    "custom pagination pages calculated",
    customPagingResponse.pagination.pages,
    customExpectedPages,
  );
  TestValidator.predicate(
    "data array length within limit",
    customPagingResponse.data.length <= 10,
  );
  // 4. Test Administrator Reference (if bans exist)
  if (emptyResponse.data.length > 0) {
    const firstBan = emptyResponse.data[0];
    // Validate ban record structure
    TestValidator.predicate("ban id exists", firstBan.id.length > 0);
    TestValidator.equals(
      "ban user_type is customer or seller",
      firstBan.user_type,
      firstBan.user_type === "customer" || firstBan.user_type === "seller"
        ? firstBan.user_type
        : null,
    );
    TestValidator.predicate(
      "ban reason is not empty",
      firstBan.reason.length > 0,
    );
    TestValidator.predicate(
      "banned_at is valid datetime",
      !Number.isNaN(Date.parse(firstBan.banned_at)),
    );
    TestValidator.predicate(
      "created_at is valid datetime",
      !Number.isNaN(Date.parse(firstBan.created_at)),
    );
    TestValidator.predicate(
      "updated_at is valid datetime",
      !Number.isNaN(Date.parse(firstBan.updated_at)),
    );
    TestValidator.equals(
      "ban_status is active or completed",
      firstBan.ban_status,
      firstBan.ban_status === "active" || firstBan.ban_status === "completed"
        ? firstBan.ban_status
        : null,
    );
    // Validate administrator reference
    TestValidator.predicate(
      "administrator id exists",
      firstBan.administrator.id.length > 0,
    );
    TestValidator.predicate(
      "administrator email is not empty",
      firstBan.administrator.email.length > 0,
    );
    TestValidator.predicate(
      "administrator display_name is not empty",
      firstBan.administrator.displayName.length > 0,
    );
  }
  // 5. Test sorting and filtering parameters
  const sortedResponse =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      adminConnection,
      {
        body: {
          sort: "created_at:desc",
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(sortedResponse);
  TestValidator.equals(
    "sorted response pagination current",
    sortedResponse.pagination.current,
    1,
  );
  // Test user_type filter
  const filteredResponse =
    await api.functional.ecommerceMall.superAdministrator.user_bans.index(
      adminConnection,
      { body: { user_type: "all" } satisfies IEcommerceMallUserBan.IRequest },
    );
  typia.assert(filteredResponse);
  TestValidator.equals(
    "filtered response pagination records",
    filteredResponse.pagination.records,
    emptyResponse.pagination.records,
  );
}