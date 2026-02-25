import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfSeller";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerApprovalResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApprovalResponse";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_seller_approval_response } from "../prepare/prepare_random_ecommerce_seller_approval_response";

export async function generate_random_ecommerce_administrator_seller_approval_responses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceSellerApprovalResponse.ICreate>;
  },
): Promise<IEcommerceSellerApprovalResponse> {
  const prepared: IEcommerceSellerApprovalResponse.ICreate =
    prepare_random_ecommerce_seller_approval_response(props.body);
  const result: IEcommerceSellerApprovalResponse =
    await api.functional.ecommerce.administrator.seller_approval_responses.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
