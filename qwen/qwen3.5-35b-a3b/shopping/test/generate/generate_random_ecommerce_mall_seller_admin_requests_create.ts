import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_admin_request_request } from "../prepare/prepare_random_ecommerce_mall_admin_request_request";

export async function generate_random_ecommerce_mall_seller_admin_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallAdminRequestRequest.ICreate>;
  },
): Promise<IEcommerceMallAdminRequestRequest> {
  const prepared: IEcommerceMallAdminRequestRequest.ICreate =
    prepare_random_ecommerce_mall_admin_request_request(props.body);
  const result: IEcommerceMallAdminRequestRequest =
    await api.functional.ecommerceMall.seller.admin_requests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
