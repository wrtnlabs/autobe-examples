import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordReset";
import { prepare_random_shopping_mall_admin_password_reset } from "../prepare/prepare_random_shopping_mall_admin_password_reset";
export async function generate_random_shopping_mall_seller_admins_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallAdminPasswordReset.ICreate> | undefined;
  },
): Promise<IShoppingMallAdminPasswordReset> {
  const prepared: IShoppingMallAdminPasswordReset.ICreate =
    prepare_random_shopping_mall_admin_password_reset(props.body);
  return await api.functional.shoppingMall.seller.admins.requests.create(
    connection,
    {
      body: prepared,
    },
  );
}
