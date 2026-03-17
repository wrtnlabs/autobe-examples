import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_refund_request } from "../prepare/prepare_random_ecommerce_mall_refund_request";

export async function generate_random_ecommerce_mall_customer_refund_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallRefundRequest.ICreate>;
  },
): Promise<IEcommerceMallRefundRequest> {
  const prepared: IEcommerceMallRefundRequest.ICreate =
    prepare_random_ecommerce_mall_refund_request(props.body);
  const result: IEcommerceMallRefundRequest =
    await api.functional.ecommerceMall.customer.refundRequests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
