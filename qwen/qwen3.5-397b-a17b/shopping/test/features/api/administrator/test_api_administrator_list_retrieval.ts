import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_administrator_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Retrieve administrator list with default pagination
  const response = await api.functional.shoppingMall.superAdmin.admins.index(
    superAdminConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is positive",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit >= 1);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate data array exists
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // 5. Validate each administrator summary has correct grade and is not soft-deleted
  for (const admin of response.data) {
    // Verify only ADMIN and SUPER_ADMIN grades are present
    TestValidator.predicate(
      "admin grade is ADMIN or SUPER_ADMIN",
      admin.grade === "ADMIN" || admin.grade === "SUPER_ADMIN",
    );
    // Verify soft-deleted admins are excluded (deleted_at must be null)
    TestValidator.predicate(
      "soft-deleted admins excluded",
      admin.deleted_at === null,
    );
  }
  // 6. Validate pagination consistency
  if (response.pagination.records > 0) {
    const expectedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation",
      response.pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals(
      "pages is 0 when no records",
      response.pagination.pages,
      0,
    );
  }
  // 7. Validate sorting (created_at descending) when multiple admins exist
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].created_at).getTime();
      const next = new Date(response.data[i + 1].created_at).getTime();
      TestValidator.predicate("sorted by created_at desc", current >= next);
    }
  }
}