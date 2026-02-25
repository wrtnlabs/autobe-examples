import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refund_request_update_status_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and is authorized
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sells1234",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // Prepare a refund request by simulating a creation (since creation API not accessible),
  // generate a random refund request to update
  const refundRequestToUpdate: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.updateRefundRequest.simulate(
      sellerConnection,
      {
        refundRequestId: typia.random<string & tags.Format<"uuid">>(),
        body: { status: "pending" },
      },
    );
  typia.assert(refundRequestToUpdate);
  // SCENARIO 1: Approve refund request
  {
    const updateBody: IShoppingMallRefundRequest.IUpdate = {
      status: "approved",
      sellerResponseReason: RandomGenerator.paragraph({ sentences: 2 }),
    };
    const updatedRefundRequest =
      await api.functional.shoppingMall.seller.refund_requests.updateRefundRequest(
        sellerConnection,
        {
          refundRequestId: refundRequestToUpdate.id,
          body: updateBody,
        },
      );
    typia.assert(updatedRefundRequest);
    TestValidator.equals(
      "refund request status updated to approved",
      updatedRefundRequest.status,
      "approved",
    );
    TestValidator.predicate(
      "respondedAt timestamp is updated",
      updatedRefundRequest.respondedAt !== null &&
        updatedRefundRequest.respondedAt !== undefined,
    );
    TestValidator.predicate(
      "related order item object exists",
      typeof updatedRefundRequest.shoppingMallOrderItem === "object" &&
        updatedRefundRequest.shoppingMallOrderItem !== null,
    );
    TestValidator.predicate(
      "customer summary object exists",
      typeof updatedRefundRequest.shoppingMallCustomer === "object" &&
        updatedRefundRequest.shoppingMallCustomer !== null,
    );
    TestValidator.equals(
      "seller summary matches logged in seller",
      updatedRefundRequest.shoppingMallSeller.id,
      sellerAuth.id,
    );
  }
  // SCENARIO 2: Reject refund request with reason
  {
    const updateBody: IShoppingMallRefundRequest.IUpdate = {
      status: "rejected",
      sellerResponseReason: RandomGenerator.paragraph({ sentences: 3 }),
    };
    const rejectedRefundRequest =
      await api.functional.shoppingMall.seller.refund_requests.updateRefundRequest(
        sellerConnection,
        {
          refundRequestId: refundRequestToUpdate.id,
          body: updateBody,
        },
      );
    typia.assert(rejectedRefundRequest);
    TestValidator.equals(
      "refund request status updated to rejected",
      rejectedRefundRequest.status,
      "rejected",
    );
    TestValidator.predicate(
      "seller response reason stored",
      typeof rejectedRefundRequest.sellerResponseReason === "string" &&
        rejectedRefundRequest.sellerResponseReason.length > 0,
    );
    TestValidator.predicate(
      "respondedAt timestamp is updated",
      rejectedRefundRequest.respondedAt !== null &&
        rejectedRefundRequest.respondedAt !== undefined,
    );
    TestValidator.equals(
      "seller summary matches logged in seller",
      rejectedRefundRequest.shoppingMallSeller.id,
      sellerAuth.id,
    );
  }
  // Error case: Update with non-existent refundRequestId
  await TestValidator.httpError(
    "updating non-existent refund request throws not found",
    404,
    async () => {
      await api.functional.shoppingMall.seller.refund_requests.updateRefundRequest(
        sellerConnection,
        {
          refundRequestId: typia.random<string & tags.Format<"uuid">>(), // non-existent
          body: { status: "approved" },
        },
      );
    },
  );
}
