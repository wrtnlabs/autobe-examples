import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_user_password_reset } from "../prepare/prepare_random_community_platform_user_password_reset";

export async function generate_random_community_platform_user_password_resets_create_password_reset(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformUserPasswordReset.ICreate> | undefined;
  },
): Promise<ICommunityPlatformUserPasswordReset> {
  const prepared: ICommunityPlatformUserPasswordReset.ICreate =
    prepare_random_community_platform_user_password_reset(props.body);
  const result: ICommunityPlatformUserPasswordReset =
    await api.functional.communityPlatform.user.password_resets.createPasswordReset(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
