import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sales_snapshot_retrieval_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Test that access to sale snapshots is restricted to authorized administrators only.
  // Attempt to retrieve the sale snapshot with an invalid or unauthorized administrator.
  // Confirm that access is denied and the response is an authorization failure.
  // Verify that no sale snapshot data is leaked and no audit log entry is created for unauthorized access attempts.
  // 1. No authentication (empty connection) - expect 401 Unauthorized error
  await TestValidator.httpError(
    "access denied without authentication",
    401,
    async () => {
      const randomSaleId = typia.random<string & tags.Format<"uuid">>();
      const randomSnapshotId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.shoppingMall.administrator.sales.snapshots.at(
        connection,
        {
          saleId: randomSaleId,
          snapshotId: randomSnapshotId,
        },
      );
    },
  );
  // 2. Unauthorized administrator tries to join and access unrelated sale snapshot
  //    This admin is not authorized to access the targeted sale snapshot.
  //    Expect 403 Forbidden or 401 Unauthorized (depending on system's denial response)
  // Create an unauthorized administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const unauthorizedAdmin = await authorize_administrator_join(
    adminConnection,
    {
      body: {
        email: `unauth_${RandomGenerator.alphaNumeric(12)}@test.com`,
        password: "password123",
      },
    },
  );
  typia.assert(unauthorizedAdmin);
  // New admin connection must be created with bearer token
  const unauthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${unauthorizedAdmin.token.access}` },
  };
  // Try to access random sale snapshot with this unauthorized admin
  const randomSaleId2 = typia.random<string & tags.Format<"uuid">>();
  const randomSnapshotId2 = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "access denied for unauthorized administrator",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.sales.snapshots.at(
        unauthorizedConnection,
        {
          saleId: randomSaleId2,
          snapshotId: randomSnapshotId2,
        },
      );
    },
  );
}
