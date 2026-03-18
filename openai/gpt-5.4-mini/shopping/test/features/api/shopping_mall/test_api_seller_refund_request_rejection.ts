import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refund_request_rejection(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredential = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallSeller.IJoin;
  const seller = await authorize_seller_join(sellerConnection, {
    body: sellerCredential,
  });
  typia.assert(seller);
  const reviewerNote = RandomGenerator.paragraph({ sentences: 2 });
  const refundRequest =
    await api.functional.shoppingMall.seller.orderItems.refundRequest.processRefundRequest(
      sellerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          decision: "reject",
          reviewedReason: reviewerNote,
        } satisfies IShoppingMallRefundRequest.IProcess,
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request should be rejected",
    refundRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "reviewed reason should match the seller note",
    refundRequest.reviewed_reason,
    reviewerNote,
  );
  TestValidator.predicate(
    "reviewed timestamp should be recorded",
    () => refundRequest.reviewed_at !== null,
  );
}
