import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_banned_user } from "../prepare/prepare_random_community_platform_banned_user";

export async function generate_random_community_platform_moderator_banned_users_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformBannedUser.ICreate> | undefined;
  },
): Promise<ICommunityPlatformBannedUser> {
  const prepared: ICommunityPlatformBannedUser.ICreate =
    prepare_random_community_platform_banned_user(props.body);
  const result: ICommunityPlatformBannedUser =
    await api.functional.communityPlatform.moderator.bannedUsers.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
