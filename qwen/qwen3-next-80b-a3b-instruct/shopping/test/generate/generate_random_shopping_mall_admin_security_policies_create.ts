import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSecurityPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityPolicy";
import { prepare_random_shopping_mall_security_policy } from "../prepare/prepare_random_shopping_mall_security_policy";
export async function generate_random_shopping_mall_admin_security_policies_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSecurityPolicy.ICreate>;
  },
): Promise<IShoppingMallSecurityPolicy> {
  const prepared: IShoppingMallSecurityPolicy.ICreate =
    prepare_random_shopping_mall_security_policy(props.body);
  const result: IShoppingMallSecurityPolicy =
    await api.functional.shoppingMall.admin.security.policies.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
