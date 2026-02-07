import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_super_admin_email_verification } from "../prepare/prepare_random_shopping_mall_super_admin_email_verification";

export async function generate_random_shopping_mall_super_admin_email_verifications_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSuperAdminEmailVerification.ICreate>;
  },
): Promise<IShoppingMallSuperAdminEmailVerification> {
  const prepared: IShoppingMallSuperAdminEmailVerification.ICreate =
    prepare_random_shopping_mall_super_admin_email_verification(props.body);
  const result: IShoppingMallSuperAdminEmailVerification =
    await api.functional.shoppingMall.superAdmin.email_verifications.create(
      connection,
      { body: prepared },
    );
  return result;
}
