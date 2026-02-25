import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequest";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refund_request_rejection_already_approved(
  connection: api.IConnection,
): Promise<void> {
  // Register seller and get authorized connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerData,
  });
  typia.assert(sellerAuthorized);
  // Create mock refund request data for testing
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // Step 1: Seller approves the refund request
  const approvalResponse =
    await api.functional.shoppingMall.seller.refund_requests.approval.approve(
      sellerConnection,
      {
        requestId: requestId,
        body: {
          action: "approve",
          reason: "Approved refund request for testing",
        } satisfies IShoppingMallOrderRefundRequest.IRequest,
      },
    );
  typia.assert(approvalResponse);
  TestValidator.equals(
    "status changed to approved",
    approvalResponse.status,
    "approved",
  );
  // Step 2: Seller attempts to reject already approved refund request
  try {
    await api.functional.shoppingMall.seller.refund_requests.rejection.reject(
      sellerConnection,
      {
        requestId: requestId,
        body: {
          rejection_reason: "Trying to reject already approved refund",
        } satisfies IShoppingMallOrderRefundRequest.IRejection,
      },
    );
    throw new Error(
      "Expected to throw error for already approved refund request",
    );
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      TestValidator.equals("status code is 409 Conflict", error.status, 409);
    } else {
      throw error;
    }
  }
}
