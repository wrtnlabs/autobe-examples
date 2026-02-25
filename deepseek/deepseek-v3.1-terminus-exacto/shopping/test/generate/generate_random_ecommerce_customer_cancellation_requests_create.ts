import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_cancellation_request } from "../prepare/prepare_random_ecommerce_cancellation_request";

export async function generate_random_ecommerce_customer_cancellation_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceCancellationRequest.ICreate>;
  },
): Promise<IEcommerceCancellationRequest> {
  const prepared: IEcommerceCancellationRequest.ICreate =
    prepare_random_ecommerce_cancellation_request(props.body);
  const result: IEcommerceCancellationRequest =
    await api.functional.ecommerce.customer.cancellation_requests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
