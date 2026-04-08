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

/**
 * Generate a random admin promotion via the API for E2E testing.
 *
 * Prepares random admin promotion data using the prepare function, then calls the promotion
 * endpoint. This is used to test the super admin's ability to promote regular administrators
 * to super administrator status.
 *
 * @param connection - API connection instance
 * @param props - Optional body data and required userId parameter for the promotion
 * @returns The created promotion record with admin and super admin details
 */
export async function generate_random_ecommerce_mall_super_admin_admin_promote(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallAdminPromotion.ICreate>;
    params: {
      userId: string;
    };
  },
): Promise<IEcommerceMallAdminPromotion> {
  const prepared: IEcommerceMallAdminPromotion.ICreate =
    prepare_random_ecommerce_mall_admin_promotion(props.body);
  const result: IEcommerceMallAdminPromotion =
    await api.functional.ecommerceMall.superAdmin.admin.promote(connection, {
      body: prepared,
      userId: props.params.userId,
    });
  return result;
}
