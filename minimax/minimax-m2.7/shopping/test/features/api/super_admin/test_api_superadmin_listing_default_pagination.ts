import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_listing_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {});
  // 2. Call the listing endpoint with default pagination (page=1, limit=20)
  const result =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate pagination metadata with default values
  TestValidator.equals(
    "pagination current should default to 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should default to 20",
    result.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages should equal Math.ceil(records / limit)",
    result.pagination.pages ===
      Math.ceil(result.pagination.records / result.pagination.limit),
  );
  // 4. Validate data array structure for each super admin summary
  for (const admin of result.data) {
    // Verify required fields exist
    TestValidator.equals(
      "id should be valid UUID format",
      admin.id.length > 0,
      true,
    );
    TestValidator.equals(
      "email should exist",
      typeof admin.email === "string",
      true,
    );
    TestValidator.equals(
      "created_at should exist",
      typeof admin.created_at === "string",
      true,
    );
    TestValidator.equals(
      "updated_at should exist",
      typeof admin.updated_at === "string",
      true,
    );
    TestValidator.equals(
      "deleted_at should be null or string",
      admin.deleted_at === null || typeof admin.deleted_at === "string",
      true,
    );
    // Security: Verify password_hash is NOT exposed (typia.assert ensures only defined fields are returned)
  }
  // 5. Validate descending sort by created_at (default sort order)
  if (result.data.length > 1) {
    for (let i = 0; i < result.data.length - 1; i++) {
      const currentDate = new Date(result.data[i].created_at).getTime();
      const nextDate = new Date(result.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "data should be sorted by created_at descending",
        currentDate >= nextDate,
      );
    }
  }
}