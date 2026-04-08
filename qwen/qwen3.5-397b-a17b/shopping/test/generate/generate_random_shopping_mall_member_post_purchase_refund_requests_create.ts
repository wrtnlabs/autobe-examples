import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_refund_request } from "../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Generate a random shopping mall refund request via the API for E2E testing.
 *
 * Creates a refund request for a delivered order item by preparing random test data
 * using the prepare function and calling the creation endpoint. The refund request
 * enters 'pending' status awaiting seller review. Each order item can have at most
 * one refund request, and the request must be submitted within 7 days of delivery.
 *
 * The generated refund request includes a random UUID for order_item_id referencing
 * a purchased item and a randomized reason text explaining the refund request.
 * Use this function to create baseline test data that can be customized via the
 * optional body parameter to override specific fields.
 *
 * @param connection The API connection configuration for the test server
 * @param props Optional parameters including body to override specific fields
 * @returns The created IShoppingMallRefundRequest entity with pending status
 */
export async function generate_random_shopping_mall_member_post_purchase_refund_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallRefundRequest.ICreate>;
  },
): Promise<IShoppingMallRefundRequest> {
  const prepared: IShoppingMallRefundRequest.ICreate =
    prepare_random_shopping_mall_refund_request(props.body);
  const result: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.member.post_purchase.refund_requests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
