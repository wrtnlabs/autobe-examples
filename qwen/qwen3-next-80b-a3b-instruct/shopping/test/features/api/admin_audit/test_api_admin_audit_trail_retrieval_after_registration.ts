import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_trail_retrieval_after_registration(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for registration
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Admin joins (triggers audit trail creation)
  const email = typia.random<string & tags.Format<"email">>();
  const joinInput = { email } satisfies IShoppingMallAdmin.IJoin;
  const authorized = await authorize_admin_join(adminConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // 2. Admin retrieves their own audit trail immediately after registration
  const auditResponse =
    await api.functional.shoppingMall.admin.snapshots.audit.index(
      adminConnection,
    );
  typia.assert(auditResponse);
  // 3. Validate: Exactly one audit record should exist - the admin registration event
  TestValidator.equals("audit trail length", auditResponse.data.length, 1);
  // Validate pagination
  TestValidator.equals(
    "pagination current",
    auditResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", auditResponse.pagination.limit, 10);
  TestValidator.equals(
    "pagination records",
    auditResponse.pagination.records,
    1,
  );
  TestValidator.equals("pagination pages", auditResponse.pagination.pages, 1);
}
