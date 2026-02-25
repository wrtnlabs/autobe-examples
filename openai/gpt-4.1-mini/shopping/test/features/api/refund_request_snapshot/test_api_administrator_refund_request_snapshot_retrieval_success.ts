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

export async function test_api_administrator_refund_request_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Administrator join and obtain authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "asdf1234",
    },
  });
  // Use the authorized adminConnection for API call
  // Use a random UUID for refund request snapshot id as scenario states known valid id
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.administrator.refundRequestSnapshots.at(
      adminConnection,
      {
        id: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Check mandatory properties presence and non-empty for status and reason
  TestValidator.predicate(
    "status is non-empty string",
    typeof snapshot.status === "string" && snapshot.status.length > 0,
  );
  TestValidator.predicate(
    "reason is non-empty string",
    typeof snapshot.reason === "string" && snapshot.reason.length > 0,
  );
  // comment optional: string or null or undefined
  if (snapshot.comment !== undefined && snapshot.comment !== null)
    TestValidator.predicate(
      "comment is string",
      typeof snapshot.comment === "string",
    );
  // Check dates are valid ISO strings
  TestValidator.predicate(
    "createdAt is ISO date",
    !isNaN(Date.parse(snapshot.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is ISO date",
    !isNaN(Date.parse(snapshot.updatedAt)),
  );
  if (snapshot.deletedAt !== undefined && snapshot.deletedAt !== null)
    TestValidator.predicate(
      "deletedAt is ISO date",
      !isNaN(Date.parse(snapshot.deletedAt)),
    );
}
