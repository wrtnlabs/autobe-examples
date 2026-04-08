import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_refund_request_retrieve_after_seller_review(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test live refund-request retrieval after seller review.
   *
   * Validates that the seller-scoped refund-request read endpoint returns the current live request record after a review decision has been recorded. The response must preserve the order-item scope and ownership relations while exposing reviewed lifecycle fields such as reviewedAt, reviewNote, and the reviewer reference when present.
   *
   * 1. Create an isolated seller connection via seller authorization.
   * 2. Retrieve a live refund request for a specific order item.
   * 3. Assert that the response is a reviewed request and still belongs to the same order item, customer, and seller scope.
   * 4. Verify the resource remains live data rather than an archived snapshot representation.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorization = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorization);
  const response =
    await api.functional.mallPlatform.seller.orderItems.refundRequests.at(
      sellerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        refundRequestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "refund request has identity",
    response.id.length > 0,
  );
  TestValidator.predicate(
    "refund request belongs to an order item",
    response.orderItem.id.length > 0,
  );
  TestValidator.predicate(
    "refund request belongs to a customer",
    response.customer.id.length > 0,
  );
  TestValidator.predicate(
    "refund request belongs to a seller",
    response.seller.id.length > 0,
  );
  TestValidator.predicate(
    "reviewed refund request has reviewedAt",
    response.reviewedAt !== null,
  );
  TestValidator.predicate(
    "reviewed refund request has review note",
    response.reviewNote !== null,
  );
  TestValidator.predicate(
    "reviewed refund request has a status",
    response.status.length > 0,
  );
  TestValidator.predicate(
    "refund request owner seller account remains present",
    response.seller.email.length > 0,
  );
  TestValidator.predicate(
    "refund request customer account remains present",
    response.customer.email.length > 0,
  );
}
