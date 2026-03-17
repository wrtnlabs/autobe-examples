import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_cancellation_snapshot_rejected_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator Authentication Setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Seller Authentication Setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller rejects a cancellation request (creates a rejected snapshot)
  const rejectedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.reject(
      sellerConnection,
      {
        cancellationRequestId: typia.random<string>(),
      },
    );
  typia.assert(rejectedRequest);
  // Validate rejection occurred
  TestValidator.equals("rejection status", rejectedRequest.status, "rejected");
  // 4. Administrator retrieves snapshot for platform oversight
  const snapshot =
    await api.functional.shoppingMall.administrator.cancellation_request_snapshots.at(
      adminConnection,
      {
        snapshotId: typia.random<string>(),
      },
    );
  typia.assert(snapshot);
  // 5. Validate rejected snapshot properties for administrator oversight
  TestValidator.predicate("snapshot has valid UUID", snapshot.id.length > 0);
  TestValidator.predicate(
    "snapshot preserves customer reason",
    snapshot.reason.length > 0,
  );
  TestValidator.equals(
    "snapshot status is rejected",
    snapshot.status,
    "rejected",
  );
  TestValidator.predicate(
    "snapshot has timestamp",
    snapshot.created_at.length > 0,
  );
  TestValidator.predicate(
    "snapshot links to cancellation request",
    snapshot.cancellation_request.id.length > 0,
  );
}
