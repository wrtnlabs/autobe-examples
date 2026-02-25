import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_refund_request_snapshot_access_control(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // Use a valid UUID to test unauthorized access
  const invalidAdminConnection: api.IConnection = { host: connection.host };
  const randomSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // We expect an HTTP 401 Unauthorized or HTTP 403 Forbidden error because no admin auth is provided
  await TestValidator.httpError(
    "unauthorized access to refund request snapshot",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.refundRequestSnapshots.at(
        invalidAdminConnection,
        { id: randomSnapshotId },
      );
    },
  );
}
