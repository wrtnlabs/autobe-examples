import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_seller_admin_request } from "../prepare/prepare_random_ecommerce_mall_seller_admin_request";

export async function generate_random_ecommerce_mall_seller_seller_admin_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallSellerAdminRequest.ICreate>;
  },
): Promise<IEcommerceMallSellerAdminRequest> {
  const prepared: IEcommerceMallSellerAdminRequest.ICreate =
    prepare_random_ecommerce_mall_seller_admin_request(props.body);
  const result: IEcommerceMallSellerAdminRequest =
    await api.functional.ecommerceMall.seller.seller.admin_requests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
