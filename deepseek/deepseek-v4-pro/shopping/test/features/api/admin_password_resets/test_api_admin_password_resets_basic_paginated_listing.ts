import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPasswordReset";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test basic paginated listing of administrator password reset tokens.
 *
 * Validates that an authenticated administrator can query the password reset token history for a specific administrator account using basic pagination parameters (page 1, limit 10). Ensures the response includes a valid pagination object with current page, limit, total records, and total pages, along with a data array of password reset summary records ordered by creation time descending.
 *
 * Each reset record must contain the unmasked token value, associated administrator summary reference, IP address, and both creation and expiration timestamps. The token field must never be masked or filtered since this is an admin audit endpoint.
 *
 * 1. Administrator registers and authenticates via the join endpoint.
 * 2. Administrator queries password reset tokens with page 1 and limit 10.
 * 3. Validates pagination metadata matches the request parameters.
 * 4. Validates each reset record contains required audit fields including the unmasked token.
 */
export async function test_api_admin_password_resets_basic_paginated_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Query password reset tokens with basic pagination
  const page =
    await api.functional.shoppingMall.admin.admins.password_resets.index(
      adminConnection,
      {
        adminId: admin.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(page);
  // 3. Validate pagination metadata
  TestValidator.equals("pagination current", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    page.pagination.pages >= 0,
  );
  // 4. Validate ordering and audit fields for each reset record
  if (page.data.length >= 2) {
    for (let i = 1; i < page.data.length; i++) {
      TestValidator.predicate(
        "ordered by created_at descending",
        page.data[i - 1].created_at >= page.data[i].created_at,
      );
    }
  }
  for (const record of page.data) {
    TestValidator.predicate("token is unmasked", record.token.length > 0);
  }
}
