import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_admin_promotion_request } from "../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

export async function generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallAdminPromotionRequest.ICreate> | undefined;
  },
): Promise<IEcommerceMallAdminPromotionRequest> {
  const prepared: IEcommerceMallAdminPromotionRequest.ICreate =
    prepare_random_ecommerce_mall_admin_promotion_request(props.body);
  const result: IEcommerceMallAdminPromotionRequest =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
