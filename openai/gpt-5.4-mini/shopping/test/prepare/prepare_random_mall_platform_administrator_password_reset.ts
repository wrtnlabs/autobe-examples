import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_mall_platform_administrator_password_reset(
  input?:
    | DeepPartial<IMallPlatformAdministratorPasswordReset.ICreate>
    | undefined,
): IMallPlatformAdministratorPasswordReset.ICreate {
  return {
    administratorId:
      input?.administratorId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
