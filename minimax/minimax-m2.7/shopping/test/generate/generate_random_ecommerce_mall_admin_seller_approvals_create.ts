import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_seller_approval } from "../prepare/prepare_random_ecommerce_mall_seller_approval";

export async function generate_random_ecommerce_mall_admin_seller_approvals_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallSellerApproval.ICreate>;
  },
): Promise<IEcommerceMallSellerApproval> {
  const prepared: IEcommerceMallSellerApproval.ICreate =
    prepare_random_ecommerce_mall_seller_approval(props.body);
  const result: IEcommerceMallSellerApproval =
    await api.functional.ecommerceMall.admin.seller_approvals.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
