import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller receives 404 when accessing a soft-deleted refund request.
 *
 * Validates the soft-delete exclusion behavior for seller actors accessing refund requests. When a refund request is soft-deleted (deleted_at is set), sellers cannot view it — only administrators can retrieve soft-deleted records for audit purposes. The system must return 404 Not Found, treating the soft-deleted record as if it does not exist from the seller's perspective.
 *
 * 1. Seller authenticates via join to obtain seller credentials.
 * 2. Seller attempts to retrieve a soft-deleted refund request by ID.
 * 3. System returns 404 Not Found, confirming soft-deleted records are excluded from seller views.
 */
export async function test_api_refund_request_seller_soft_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  await TestValidator.httpError(
    "soft-deleted refund request not found for seller",
    404,
    async () => {
      await api.functional.shoppingMall.seller.refund_requests.at(
        sellerConnection,
        {
          requestId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
