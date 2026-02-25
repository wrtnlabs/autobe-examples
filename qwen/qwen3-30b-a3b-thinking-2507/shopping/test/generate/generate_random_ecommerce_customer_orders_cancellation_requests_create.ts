import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_cancellation_request } from "../prepare/prepare_random_ecommerce_cancellation_request";

export async function generate_random_ecommerce_customer_orders_cancellation_requests_create(
  connection: IConnection,
  props: {
    body?: DeepPartial<IEcommerceCancellationRequest.ICreate> | undefined;
    params?: {
      orderId: string;
    };
  },
): Promise<IEcommerceCancellationRequest> {
  const prepared: IEcommerceCancellationRequest.ICreate =
    prepare_random_ecommerce_cancellation_request(props.body);
  const result: IEcommerceCancellationRequest =
    await api.functional.ecommerce.customer.orders.cancellation_requests.create(
      connection,
      {
        orderId: props.params?.orderId ?? RandomGenerator.alphaNumeric(32),
        body: prepared,
      },
    );
  return result;
}
