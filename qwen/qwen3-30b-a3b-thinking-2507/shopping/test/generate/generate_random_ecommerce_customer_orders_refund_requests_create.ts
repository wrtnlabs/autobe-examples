import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_refund_request } from "../prepare/prepare_random_ecommerce_refund_request";

export async function generate_random_ecommerce_customer_orders_refund_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceRefundRequest.ICreate> | undefined;
    params: {
      id: string;
    };
  },
): Promise<IEcommerceRefundRequest> {
  const prepared: IEcommerceRefundRequest.ICreate =
    prepare_random_ecommerce_refund_request(props.body);
  const result: IEcommerceRefundRequest =
    await api.functional.ecommerce.customer.orders.refund_requests.create(
      connection,
      {
        id: props.params.id,
        body: prepared,
      },
    );
  return result;
}
