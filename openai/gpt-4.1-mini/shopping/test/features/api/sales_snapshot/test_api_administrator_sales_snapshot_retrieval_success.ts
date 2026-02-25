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

export async function test_api_administrator_sales_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator account creation and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinOutput: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testpassword",
      },
    });
  // 2. Prepare valid UUIDs for saleId and snapshotId
  const saleId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the sale snapshot
  const snapshot: IShoppingMallSaleSnapshot =
    await api.functional.shoppingMall.administrator.sales.snapshots.at(
      adminConnection,
      {
        saleId: saleId,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot fields correspond correctly
  TestValidator.equals("saleId matches", snapshot.shoppingMallSaleId, saleId);
  TestValidator.predicate(
    "title present",
    typeof snapshot.title === "string" && snapshot.title.length > 0,
  );
  TestValidator.predicate(
    "description present",
    typeof snapshot.description === "string" && snapshot.description.length > 0,
  );
  TestValidator.predicate(
    "categoryId valid UUID",
    /^[0-9a-fA-F-]{36}$/.test(snapshot.categoryId),
  );
  TestValidator.predicate("basePrice positive", snapshot.basePrice > 0);
  TestValidator.predicate(
    "createdAt valid ISO datetime",
    typeof snapshot.createdAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(snapshot.createdAt),
  );
  TestValidator.predicate(
    "updatedAt valid ISO datetime",
    typeof snapshot.updatedAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(snapshot.updatedAt),
  );
  TestValidator.predicate(
    "deletedAt is null or valid ISO datetime",
    snapshot.deletedAt === null ||
      (typeof snapshot.deletedAt === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(
          snapshot.deletedAt,
        )),
  );
  // Note: Audit log entry verification is assumed to be done on backend
}
