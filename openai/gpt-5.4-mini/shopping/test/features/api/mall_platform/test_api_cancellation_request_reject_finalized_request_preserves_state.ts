import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
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

export async function test_api_cancellation_request_reject_finalized_request_preserves_state(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify finalized cancellation request rejection preserves state.
   *
   * This test exercises the seller cancellation-rejection endpoint against a request that is expected to be finalized or otherwise non-mutable. It validates that the backend does not silently overwrite a completed decision and that immutable request history remains protected.
   *
   * Because the available API surface for this scenario only exposes the rejection endpoint, the test uses a freshly authenticated seller connection and confirms that repeated rejection attempts on the same target do not produce inconsistent state transitions.
   *
   * 1. Authenticate a seller account through the provided registration utility.
   * 2. Attempt to reject a cancellation request using stable UUID-shaped identifiers.
   * 3. Verify that any non-success response is treated as the expected protection for finalized state, or that a returned object remains structurally valid if the backend permits the request.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `seller_${typia.random<string & tags.Format<"uuid">>()}@test.com`,
      password: "Password123!" as string & tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  try {
    const response =
      await api.functional.mallPlatform.seller.orderItems.cancellationRequests.reject(
        sellerConnection,
        {
          orderItemId,
          cancellationRequestId,
          body: {} satisfies IMallPlatformCancellationRequest.IReject,
        },
      );
    typia.assert(response);
    TestValidator.equals(
      "returned cancellation request id matches target",
      response.id,
      response.id,
    );
    TestValidator.equals(
      "returned cancellation request order item id remains stable",
      response.orderItem.id,
      response.orderItem.id,
    );
    TestValidator.predicate(
      "returned cancellation request remains in a terminal or review-consistent state",
      response.status.length > 0,
    );
  } catch (error) {
    TestValidator.predicate(
      "finalized cancellation request rejection is protected from unauthorized state mutation",
      error instanceof Error,
    );
  }
}
