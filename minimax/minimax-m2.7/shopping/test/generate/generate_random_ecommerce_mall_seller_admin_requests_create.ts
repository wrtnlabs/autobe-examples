import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_admin_request } from "../prepare/prepare_random_ecommerce_mall_admin_request";

export async function generate_random_ecommerce_mall_seller_admin_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallAdminRequest.ICreate>;
  },
): Promise<IEcommerceMallAdminRequest> {
  const prepared: IEcommerceMallAdminRequest.ICreate =
    prepare_random_ecommerce_mall_admin_request(props.body);
  const result: IEcommerceMallAdminRequest =
    await api.functional.ecommerceMall.seller.admin.requests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
