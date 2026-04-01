import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_administrator_password_reset } from "../prepare/prepare_random_mall_platform_administrator_password_reset";

export async function generate_random_mall_platform_customer_password_resets_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IMallPlatformAdministratorPasswordReset.ICreate>
      | undefined;
  },
): Promise<IMallPlatformAdministratorPasswordReset> {
  const prepared: IMallPlatformAdministratorPasswordReset.ICreate =
    prepare_random_mall_platform_administrator_password_reset(props.body);
  return await api.functional.mallPlatform.customer.password_resets.create(
    connection,
    {
      body: prepared,
    },
  );
}
