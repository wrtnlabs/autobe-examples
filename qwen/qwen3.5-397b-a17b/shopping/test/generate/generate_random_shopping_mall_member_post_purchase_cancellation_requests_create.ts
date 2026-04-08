import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallPostPurchaseCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequestSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_post_purchase_cancellation_request } from "../prepare/prepare_random_shopping_mall_post_purchase_cancellation_request";

/**
 * Generate a random shopping mall post-purchase cancellation request via the API for E2E testing.
 *
 * Prepares random cancellation request data using the prepare function, then calls the creation endpoint to create an actual cancellation request resource. The cancellation request is created for an order item that must have 'paid' status and not yet been shipped.
 *
 * The prepare function generates a valid UUID for the shopping_mall_order_item_id and a realistic cancellation reason text. Test cases can override specific properties through the DeepPartial input to customize the cancellation request data for specific test scenarios.
 *
 * The created cancellation request enters 'pending' status awaiting seller review. Only one cancellation request can exist per order item due to unique constraint.
 *
 * @param connection The API connection for authentication and server targeting
 * @param props Optional properties including body overrides for customizing the cancellation request data
 * @returns The created IShoppingMallPostPurchaseCancellationRequest entity with pending status
 */
export async function generate_random_shopping_mall_member_post_purchase_cancellation_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallPostPurchaseCancellationRequest.ICreate>;
  },
): Promise<IShoppingMallPostPurchaseCancellationRequest> {
  const prepared: IShoppingMallPostPurchaseCancellationRequest.ICreate =
    prepare_random_shopping_mall_post_purchase_cancellation_request(props.body);
  const result: IShoppingMallPostPurchaseCancellationRequest =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
