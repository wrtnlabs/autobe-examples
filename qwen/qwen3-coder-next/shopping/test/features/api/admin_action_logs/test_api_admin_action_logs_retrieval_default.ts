import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminActionLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminActionLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_action_logs_retrieval_default(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Action: Admin retrieves logs with default pagination and sorting
  const result =
    await api.functional.ecommerceMall.admin.admin_action_logs.index(
      adminConnection,
      {
        body: {},
      },
    );
  // Validation: Response structure and sorting
  typia.assert(result);
  TestValidator.equals("pagination current", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 100);
  TestValidator.predicate("results sorted by created_at descending", () => {
    if (result.data.length < 2) return true;
    for (let i = 1; i < result.data.length; i++) {
      const prev = new Date(result.data[i - 1].created_at).getTime();
      const curr = new Date(result.data[i].created_at).getTime();
      if (prev < curr) return false;
    }
    return true;
  });
  // Validate required fields in each log entry
  if (result.data.length > 0) {
    const log = result.data[0];
    TestValidator.predicate(
      "has action_type",
      typeof log.action_type === "string",
    );
    TestValidator.predicate(
      "has target_id",
      typeof log.target_id === "string" && log.target_id.length > 0,
    );
    TestValidator.predicate(
      "has description",
      typeof log.description === "string" && log.description.length > 0,
    );
    TestValidator.predicate(
      "has created_at",
      typeof log.created_at === "string" && log.created_at.length > 0,
    );
    TestValidator.predicate(
      "has admin_id",
      typeof log.ecommerce_mall_admin_id === "string" &&
        log.ecommerce_mall_admin_id.length > 0,
    );
  }
}
