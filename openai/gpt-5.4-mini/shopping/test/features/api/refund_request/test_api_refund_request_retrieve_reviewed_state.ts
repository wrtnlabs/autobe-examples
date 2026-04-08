import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
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

export async function test_api_refund_request_retrieve_reviewed_state(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test seller-side retrieval of a refund request for audit visibility.
   *
   * Verifies that a seller authenticated through the seller join flow can call
   * the seller-scoped refund request retrieval endpoint and receive a valid live
   * refund request payload for the specified order item scope.
   *
   * 1. Authenticate a dedicated seller connection from the base host.
   * 2. Retrieve the refund request by order item and request identifiers.
   * 3. Validate the response as a refund-request DTO and confirm the lookup is stable.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.mallPlatform.seller.orderItems.refundRequests.at(
      sellerConnection,
      {
        orderItemId,
        refundRequestId,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "order item id scope preserved",
    output.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "refund request id preserved",
    output.id,
    refundRequestId,
  );
  TestValidator.predicate(
    "refund request has a status",
    output.status.length > 0,
  );
  TestValidator.predicate(
    "refund request has createdAt",
    output.createdAt.length > 0,
  );
  TestValidator.predicate(
    "refund request has updatedAt",
    output.updatedAt.length > 0,
  );
}
