import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_customer_order_items_refund_requests_create } from "../../../generate/generate_random_mall_platform_customer_order_items_refund_requests_create";
import { prepare_random_mall_platform_refund_request } from "../../../prepare/prepare_random_mall_platform_refund_request";

export async function test_api_refund_request_update_ineligible_state_rejected(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/checkout",
      referrer: "https://example.com/catalog",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const created =
    await generate_random_mall_platform_customer_order_items_refund_requests_create(
      customerConnection,
      {
        params: { orderItemId },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IMallPlatformRefundRequest.ICreate,
      },
    );
  typia.assert(created);
  const originalReason = created.reason;
  const originalStatus = created.status;
  const originalReviewedAt = created.reviewedAt;
  const originalReviewNote = created.reviewNote;
  const originalUpdatedAt = created.updatedAt;
  await TestValidator.error(
    "refund request update should be rejected in ineligible state",
    async () => {
      await api.functional.mallPlatform.seller.orderItems.refundRequests.update(
        sellerConnection,
        {
          orderItemId,
          refundRequestId: created.id,
          body: {
            reason: RandomGenerator.paragraph({ sentences: 4 }),
            status: "rejected",
            reviewed_at: new Date().toISOString(),
            review_note: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IMallPlatformRefundRequest.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "refund request reason should remain unchanged in memory",
    created.reason,
    originalReason,
  );
  TestValidator.equals(
    "refund request status should remain unchanged in memory",
    created.status,
    originalStatus,
  );
  TestValidator.equals(
    "refund request reviewedAt should remain unchanged in memory",
    created.reviewedAt,
    originalReviewedAt,
  );
  TestValidator.equals(
    "refund request reviewNote should remain unchanged in memory",
    created.reviewNote,
    originalReviewNote,
  );
  TestValidator.equals(
    "refund request updatedAt should remain unchanged in memory",
    created.updatedAt,
    originalUpdatedAt,
  );
}
