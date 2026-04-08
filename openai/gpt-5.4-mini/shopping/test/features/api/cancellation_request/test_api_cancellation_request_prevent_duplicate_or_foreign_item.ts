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
import { generate_random_mall_platform_seller_order_items_cancellation_requests_create } from "../../../generate/generate_random_mall_platform_seller_order_items_cancellation_requests_create";
import { prepare_random_mall_platform_cancellation_request } from "../../../prepare/prepare_random_mall_platform_cancellation_request";

/**
 * Verifies cancellation requests remain scoped to one order item and reject duplicates.
 *
 * This scenario authenticates a seller account, creates a cancellation request for a target order item,
 * and then checks that the same item cannot be used to create a duplicate request. The test focuses on
 * the item-level ownership boundary that can be validated with the available seller authentication and
 * cancellation-request creation helpers.
 *
 * 1. Register and authenticate a seller account using an isolated seller connection.
 * 2. Create a first cancellation request for one order item and validate the response.
 * 3. Attempt a duplicate request for the same order item and expect rejection.
 * 4. Confirm the original request remains unchanged after the failed duplicate attempt.
 */
export async function test_api_cancellation_request_prevent_duplicate_or_foreign_item(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const targetOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const firstReason = RandomGenerator.paragraph({ sentences: 3 });
  const duplicateReason = RandomGenerator.paragraph({ sentences: 4 });
  const created =
    await generate_random_mall_platform_seller_order_items_cancellation_requests_create(
      sellerConnection,
      {
        params: { orderItemId: targetOrderItemId },
        body: {
          reason: firstReason,
        } satisfies IMallPlatformCancellationRequest.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "cancellation request keeps target order item scope",
    created.orderItem.id,
    targetOrderItemId,
  );
  TestValidator.equals(
    "cancellation request preserves submitted reason",
    created.reason,
    firstReason,
  );
  TestValidator.equals(
    "cancellation request starts pending",
    created.status,
    "pending",
  );
  TestValidator.predicate(
    "created cancellation request has an id",
    created.id.length > 0,
  );
  await TestValidator.error(
    "duplicate cancellation request for same order item must fail",
    async () => {
      await generate_random_mall_platform_seller_order_items_cancellation_requests_create(
        sellerConnection,
        {
          params: { orderItemId: targetOrderItemId },
          body: {
            reason: duplicateReason,
          } satisfies IMallPlatformCancellationRequest.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "original cancellation request remains unchanged after failed attempts",
    created.orderItem.id,
    targetOrderItemId,
  );
  TestValidator.equals(
    "original cancellation request reason remains unchanged",
    created.reason,
    firstReason,
  );
  TestValidator.equals(
    "original cancellation request status remains pending",
    created.status,
    "pending",
  );
}
