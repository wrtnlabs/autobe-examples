import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_admin_promotion } from "../prepare/prepare_random_ecommerce_mall_admin_promotion";

export async function generate_random_ecommerce_mall_super_admin_super_admin_admins_promote(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallAdminPromotion.ICreate> | undefined;
    params: {
      adminId: string;
    };
  },
): Promise<IEcommerceMallAdminPromotion> {
  const prepared: IEcommerceMallAdminPromotion.ICreate =
    prepare_random_ecommerce_mall_admin_promotion(props.body);
  return await api.functional.ecommerceMall.superAdmin.superAdmin.admins.promote(
    connection,
    {
      body: prepared,
      adminId: props.params.adminId,
    },
  );
}
