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
 * Prepares random refund request data using the prepare function, then calls the creation endpoint.
 * This function creates a refund request for a delivered order item by submitting the order_item_id
 * and reason through the member-authenticated endpoint. The generated refund request enters 'pending'
 * status awaiting seller review.
 *
 * The function uses the prepare_random_shopping_mall_refund_request to generate valid test data
 * conforming to IShoppingMallRefundRequest.ICreate type. Optional body parameter allows partial
 * customization of the generated data for specific test scenarios.
 *
 * @param connection API connection information
 * @param props Optional props containing partial body data to override default random values
 * @returns The created IShoppingMallRefundRequest entity with pending status
 */
export async function generate_random_shopping_mall_member_refund_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallRefundRequest.ICreate>;
  },
): Promise<IShoppingMallRefundRequest> {
  const prepared: IShoppingMallRefundRequest.ICreate =
    prepare_random_shopping_mall_refund_request(props.body);
  const result: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.member.refund_requests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
