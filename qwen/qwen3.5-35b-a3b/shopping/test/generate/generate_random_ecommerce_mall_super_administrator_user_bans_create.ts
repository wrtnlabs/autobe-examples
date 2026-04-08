import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import type { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
import type { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_user_ban } from "../prepare/prepare_random_ecommerce_mall_user_ban";

export async function generate_random_ecommerce_mall_super_administrator_user_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallUserBan.ICreate>;
  },
): Promise<IEcommerceMallUserBan> {
  const prepared: IEcommerceMallUserBan.ICreate =
    prepare_random_ecommerce_mall_user_ban(props.body);
  const result: IEcommerceMallUserBan =
    await api.functional.ecommerceMall.superAdministrator.user_bans.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
