import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_index_with_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create an admin account (active - deleted_at: null)
  const adminConnection: api.IConnection = { host: connection.host };
  const user = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IEcommerceAdmin.IJoin,
  });
  // Query admin index with deleted=true (should return soft-deleted accounts)
  const result = await api.functional.ecommerce.admin.admins.index(
    adminConnection,
    {
      body: {
        deleted: true,
      } satisfies IEcommerceAdmin.IRequest,
    },
  );
  typia.assert(result);
  // Verify the soft-deleted accounts (should be no soft-deleted accounts yet)
  TestValidator.equals(
    "Should have 0 records when deleted=true (no soft-deleted accounts)",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "Should have 0 data items when deleted=true (no soft-deleted accounts)",
    result.data.length,
    0,
  );
}
