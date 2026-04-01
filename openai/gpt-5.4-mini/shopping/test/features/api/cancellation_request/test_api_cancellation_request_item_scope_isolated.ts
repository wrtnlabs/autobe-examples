import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_cancellation_request_item_scope_isolated(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: `seller-${RandomGenerator.alphabets(8)}@test.com`,
      password: `P@ssw0rd-${RandomGenerator.alphaNumeric(10)}`,
      href: "https://example.com/seller/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const created =
    await api.functional.mallPlatform.seller.orderItems.cancellationRequests.patchByOrderitemid(
      sellerConnection,
      {
        orderItemId,
        body: {
          reason: "Initial cancellation reason",
        } satisfies IMallPlatformCancellationRequest.IUpdate,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "cancellation request must remain attached to the targeted order item",
    created.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "cancellation reason should be stored",
    created.reason,
    "Initial cancellation reason",
  );
  const updated =
    await api.functional.mallPlatform.seller.orderItems.cancellationRequests.patchByOrderitemid(
      sellerConnection,
      {
        orderItemId,
        body: {
          reason: "Revised cancellation reason",
        } satisfies IMallPlatformCancellationRequest.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated cancellation request must stay on the same order item",
    updated.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "updated cancellation request should reuse the same request record",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "updated cancellation reason should replace the previous reason",
    updated.reason,
    "Revised cancellation reason",
  );
  TestValidator.notEquals(
    "reason should actually change after update",
    created.reason,
    updated.reason,
  );
}
