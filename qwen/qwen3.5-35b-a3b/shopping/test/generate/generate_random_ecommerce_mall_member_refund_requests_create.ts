import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_refund_request } from "../prepare/prepare_random_ecommerce_mall_refund_request";

/**
 * Generate a random refund request via the API for E2E testing.
 *
 * Prepares random refund request creation data using the prepare function,
 * then calls the creation endpoint to create a refund request for a delivered
 * order item. The refund request is created with pending status and requires
 * seller approval before processing.
 */
export async function generate_random_ecommerce_mall_member_refund_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallRefundRequest.ICreate>;
  },
): Promise<IEcommerceMallRefundRequest> {
  const prepared: IEcommerceMallRefundRequest.ICreate =
    prepare_random_ecommerce_mall_refund_request(props.body);
  const result: IEcommerceMallRefundRequest =
    await api.functional.ecommerceMall.member.refund_requests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
