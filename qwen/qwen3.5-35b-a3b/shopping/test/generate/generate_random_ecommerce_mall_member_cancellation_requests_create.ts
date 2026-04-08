import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
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

export async function generate_random_ecommerce_mall_member_cancellation_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallCancellationRequest.ICreate> | undefined;
  },
): Promise<IEcommerceMallCancellationRequest> {
  const prepared: IEcommerceMallCancellationRequest.ICreate =
    prepare_random_ecommerce_mall_cancellation_request(props.body);
  return await api.functional.ecommerceMall.member.cancellation_requests.create(
    connection,
    {
      body: prepared,
    },
  );
}
