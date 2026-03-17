import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_cancellation_request } from "../prepare/prepare_random_ecommerce_mall_cancellation_request";

export async function generate_random_ecommerce_mall_customer_cancellation_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallCancellationRequest.ICreate>;
  },
): Promise<IEcommerceMallCancellationRequest> {
  const prepared: IEcommerceMallCancellationRequest.ICreate =
    prepare_random_ecommerce_mall_cancellation_request(props.body);
  const result: IEcommerceMallCancellationRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
