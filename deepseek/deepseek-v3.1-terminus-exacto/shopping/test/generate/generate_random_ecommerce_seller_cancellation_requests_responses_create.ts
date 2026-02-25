import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCancellationResponseRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationResponseRecord";
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

import { prepare_random_ecommerce_cancellation_response_record } from "../prepare/prepare_random_ecommerce_cancellation_response_record";

export async function generate_random_ecommerce_seller_cancellation_requests_responses_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IEcommerceCancellationResponseRecord.ICreate>
      | undefined;
    params: {
      cancellationRequestId: string;
    };
  },
): Promise<IEcommerceCancellationResponseRecord> {
  const prepared: IEcommerceCancellationResponseRecord.ICreate =
    prepare_random_ecommerce_cancellation_response_record(props.body);
  const result: IEcommerceCancellationResponseRecord =
    await api.functional.ecommerce.seller.cancellation_requests.responses.create(
      connection,
      {
        body: prepared,
        cancellationRequestId: props.params.cancellationRequestId,
      },
    );
  return result;
}
