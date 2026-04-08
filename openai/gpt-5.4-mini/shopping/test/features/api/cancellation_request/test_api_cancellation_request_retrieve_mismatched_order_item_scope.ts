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

/**
 * Verify cancellation request retrieval is scoped to the matching order item.
 *
 * This test authenticates a seller and checks that the cancellation-request retrieval endpoint does not expose a request through an unrelated order item path. The business rule under validation is strict relationship scoping: a cancellation request must only be reachable from the order item it belongs to, so mismatched identifiers must return a normal not-found or business error rather than another item's data.
 *
 * 1. Authenticate as a seller through the provided join utility.
 * 2. Generate two different order item identifiers and one cancellation request identifier.
 * 3. Request the cancellation through the wrong order item scope.
 * 4. Assert the API rejects the mismatched scope.
 */
export async function test_api_cancellation_request_retrieve_mismatched_order_item_scope(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const validOrderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const mismatchedOrderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const cancellationRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "mismatched order item should not expose cancellation request",
    async () => {
      const output =
        await api.functional.mallPlatform.seller.orderItems.cancellationRequests.at(
          sellerConnection,
          {
            orderItemId: mismatchedOrderItemId,
            cancellationRequestId,
          },
        );
      typia.assert(output);
    },
  );
  await TestValidator.error(
    "matching another order item id should not grant access",
    async () => {
      const output =
        await api.functional.mallPlatform.seller.orderItems.cancellationRequests.at(
          sellerConnection,
          {
            orderItemId: validOrderItemId,
            cancellationRequestId,
          },
        );
      typia.assert(output);
    },
  );
}
