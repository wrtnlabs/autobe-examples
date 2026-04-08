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

export async function test_api_cancellation_request_create_paid_unshipped_item(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test creating a cancellation request for a paid, unshipped order item.
   *
   * This scenario validates the seller-facing cancellation request creation flow for a single order item. It ensures the request is created in a pending state, preserves the submitted reason, and returns the linked order item summary without altering its current paid status at submission time.
   *
   * 1. Authenticate a seller account with a fresh connection.
   * 2. Submit a cancellation request with a meaningful reason.
   * 3. Validate the created request fields and linked order item summary.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com` satisfies string,
      password: `Pw${RandomGenerator.alphaNumeric(10)}`,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const request =
    await generate_random_mall_platform_seller_order_items_cancellation_requests_create(
      sellerConnection,
      {
        params: {
          orderItemId,
        },
        body: {
          reason,
        } satisfies IMallPlatformCancellationRequest.ICreate,
      },
    );
  typia.assert(request);
  TestValidator.equals("cancellation request reason", request.reason, reason);
  TestValidator.equals(
    "cancellation request status",
    request.status,
    "pending",
  );
  TestValidator.equals("cancellation request reviewer", request.reviewer, null);
  TestValidator.equals(
    "cancellation request reviewedAt",
    request.reviewedAt,
    null,
  );
  TestValidator.equals(
    "cancellation request reviewResult",
    request.reviewResult,
    null,
  );
  TestValidator.equals(
    "cancellation request reviewerNote",
    request.reviewerNote,
    null,
  );
  TestValidator.equals(
    "cancellation request deletedAt",
    request.deletedAt,
    null,
  );
  TestValidator.equals(
    "linked order item id",
    request.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "linked order item status",
    request.orderItem.status,
    "paid",
  );
  TestValidator.predicate(
    "linked order item quantity is positive",
    request.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "request createdAt is present",
    request.createdAt.length > 0,
  );
  TestValidator.predicate(
    "request updatedAt is present",
    request.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is not earlier than createdAt",
    new Date(request.updatedAt).getTime() >=
      new Date(request.createdAt).getTime(),
  );
}
