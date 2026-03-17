import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_approval_status_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      shopName: RandomGenerator.name(),
    },
  });
  // Get approval status
  const status =
    await api.functional.shoppingMall.seller.sellers.approval_status.get(
      sellerConnection,
    );
  typia.assert(status);
  // Validate the approval status structure
  TestValidator.predicate(
    "approvalStatus is a string",
    typeof status.approvalStatus === "string",
  );
  TestValidator.predicate(
    "rejectionReason is string or null",
    status.rejectionReason === null ||
      typeof status.rejectionReason === "string",
  );
  // When status is rejected, rejectionReason should be a non-null string
  if (status.approvalStatus === "rejected") {
    TestValidator.predicate(
      "rejectionReason exists for rejected status",
      status.rejectionReason !== null,
    );
  }
}
