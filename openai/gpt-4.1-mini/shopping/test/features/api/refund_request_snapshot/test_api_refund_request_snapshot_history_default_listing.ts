import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_refund_request_snapshot_history_default_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuthorized);
  // 2. Call refund request snapshots history endpoint with empty filters
  const historyResponse =
    await api.functional.shoppingMall.administrator.refundRequestSnapshots.history.index(
      adminConnection,
      { body: { page: 1, limit: 10 } },
    );
  typia.assert(historyResponse);
  // 3. Validate pagination metadata
  const { pagination, data } = historyResponse;
  typia.assert(pagination);
  TestValidator.predicate("pagination.current >= 1", pagination.current >= 1);
  TestValidator.predicate("pagination.limit >= 1", pagination.limit >= 1);
  TestValidator.predicate("pagination.limit <= 100", pagination.limit <= 100);
  TestValidator.predicate("pagination.records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination.pages >= 0", pagination.pages >= 0);
  // 4. Validate data array and fields
  TestValidator.predicate("data is array", Array.isArray(data));
  for (const snapshot of data) {
    typia.assert(snapshot);
    // Check required fields
    TestValidator.predicate(
      "snapshot.id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    TestValidator.predicate(
      "snapshot.status non-empty",
      typeof snapshot.status === "string" && snapshot.status.length > 0,
    );
    TestValidator.predicate(
      "snapshot.reason non-empty",
      typeof snapshot.reason === "string" && snapshot.reason.length > 0,
    );
    TestValidator.predicate(
      "snapshot.createdAt valid datetime",
      typeof snapshot.createdAt === "string" && snapshot.createdAt.length > 0,
    );
    // refundRequest summary check
    const refundRequest = snapshot.refundRequest;
    typia.assert(refundRequest);
    TestValidator.predicate(
      "refundRequest.id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        refundRequest.id,
      ),
    );
    TestValidator.predicate(
      "refundRequest.status non-empty",
      typeof refundRequest.status === "string" &&
        refundRequest.status.length > 0,
    );
    TestValidator.predicate(
      "refundRequest.requestReason non-empty",
      typeof refundRequest.requestReason === "string" &&
        refundRequest.requestReason.length > 0,
    );
  }
}
