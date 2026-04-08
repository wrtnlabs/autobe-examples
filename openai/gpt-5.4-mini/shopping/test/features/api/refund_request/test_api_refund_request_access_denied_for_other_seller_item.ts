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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_refund_request_access_denied_for_other_seller_item(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test seller access denial for refund requests on a foreign order item.
   *
   * Verifies that the seller-scoped refund-request listing endpoint rejects an
   * authenticated seller when the requested order item is not within their
   * ownership scope. This protects refund workflow data from being exposed
   * across seller boundaries.
   *
   * 1. Authenticate a seller account using the seller join utility.
   * 2. Request refund listings for a foreign order item UUID.
   * 3. Assert the platform denies the request with an HTTP authorization or
   *    not-found error.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  await TestValidator.httpError(
    "seller cannot access refund requests for a foreign order item",
    [403, 404],
    async () => {
      await api.functional.mallPlatform.seller.orderItems.refundRequests.index(
        sellerConnection,
        {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 10,
          } satisfies IMallPlatformRefundRequest.IRequest,
        },
      );
    },
  );
}
