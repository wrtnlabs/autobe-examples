import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  // 2. Call PATCH /ecommerceMall/superAdmin/admins with empty request body
  const response = await api.functional.ecommerceMall.superAdmin.admins.index(
    superAdminConnection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // 3. Verify pagination metadata is present and valid
  TestValidator.predicate(
    "pagination object exists",
    response.pagination !== null && response.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // 4. Verify at least one admin exists (the one we just created)
  TestValidator.predicate("has at least one admin", response.data.length >= 1);
  // 5. Verify the super admin we created is in the list
  const createdAdmin = response.data.find(
    (admin) => admin.id === authorized.id,
  );
  TestValidator.predicate(
    "created admin found in list",
    createdAdmin !== undefined,
  );
  TestValidator.equals(
    "created admin is_super_admin true",
    createdAdmin?.is_super_admin,
    true,
  );
  // 6. Verify each admin record structure (type validation done by typia.assert above)
  // Verify required fields are present via the response type definition
  // Note: password_hash is explicitly excluded from ISummary type, verified by typia.assert
  // 7. Verify results are ordered by created_at descending
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].created_at).getTime();
      const next = new Date(response.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "ordered by created_at descending",
        current >= next,
      );
    }
  }
}