import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_user_ban } from "../prepare/prepare_random_ecommerce_mall_user_ban";

export async function generate_random_ecommerce_mall_admin_user_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallUserBan.ICreate> | undefined;
    params?:
      | {
          [key: string]: string;
        }
      | undefined;
  },
): Promise<IEcommerceMallUserBan> {
  const prepared: IEcommerceMallUserBan.ICreate =
    prepare_random_ecommerce_mall_user_ban(props.body);
  return await api.functional.ecommerceMall.admin.user_bans.create(connection, {
    body: prepared,
  });
}
