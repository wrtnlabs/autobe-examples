import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_cancellation_request } from "../prepare/prepare_random_shopping_mall_cancellation_request";

/**
 * Generate a random shopping mall cancellation request via the API for E2E testing.
 *
 * Prepares random cancellation request data using the prepare function, then calls the creation endpoint to create a new cancellation request for an order item. The cancellation request is created with 'pending' status awaiting seller review.
 *
 * The order_item_id references the target order item that the customer wants to cancel. The reason field contains a randomly generated cancellation explanation. Both fields can be overridden via the props.body parameter for test-specific scenarios.
 *
 * Authentication is handled separately in test scenarios through the connection headers. The API validates that the order item exists, belongs to the authenticated member, and has 'paid' status before creating the cancellation request.
 */
export async function generate_random_shopping_mall_member_cancellation_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCancellationRequest.ICreate>;
  },
): Promise<IShoppingMallCancellationRequest> {
  const prepared: IShoppingMallCancellationRequest.ICreate =
    prepare_random_shopping_mall_cancellation_request(props.body);
  const result: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.member.cancellation_requests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
