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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_order_items_refund_requests_create } from "../../../generate/generate_random_mall_platform_customer_order_items_refund_requests_create";
import { prepare_random_mall_platform_refund_request } from "../../../prepare/prepare_random_mall_platform_refund_request";

export async function test_api_refund_request_view_own_request(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  const requested =
    await generate_random_mall_platform_customer_order_items_refund_requests_create(
      customerConnection,
      {
        params: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformRefundRequest.ICreate,
      },
    );
  typia.assert(requested);
  const viewed = await api.functional.mallPlatform.customer.refundRequests.at(
    customerConnection,
    {
      refundRequestId: requested.id,
    },
  );
  typia.assert(viewed);
  TestValidator.equals("refund request id", viewed.id, requested.id);
  TestValidator.equals(
    "refund request reason",
    viewed.reason,
    requested.reason,
  );
  TestValidator.equals(
    "refund request status",
    viewed.status,
    requested.status,
  );
  TestValidator.equals(
    "refund request order item",
    viewed.orderItem.id,
    requested.orderItem.id,
  );
  TestValidator.equals(
    "refund request customer",
    viewed.customer.id,
    requested.customer.id,
  );
  TestValidator.equals(
    "refund request seller",
    viewed.seller.id,
    requested.seller.id,
  );
  TestValidator.equals(
    "refund request createdAt",
    viewed.createdAt,
    requested.createdAt,
  );
  TestValidator.equals(
    "refund request updatedAt",
    viewed.updatedAt,
    requested.updatedAt,
  );
  TestValidator.equals(
    "refund request deletedAt",
    viewed.deletedAt,
    requested.deletedAt,
  );
  TestValidator.equals(
    "refund request reviewedAt",
    viewed.reviewedAt,
    requested.reviewedAt,
  );
  TestValidator.equals(
    "refund request reviewNote",
    viewed.reviewNote,
    requested.reviewNote,
  );
  TestValidator.equals(
    "refund request administrator",
    viewed.administrator,
    requested.administrator,
  );
}
