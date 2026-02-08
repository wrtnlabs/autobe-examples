import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_community_banned_user } from "../prepare/prepare_random_community_platform_community_banned_user";

export async function generate_random_community_platform_moderator_community_banned_users_create_community_banned_user(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformCommunityBannedUser.ICreate>
      | undefined;
  },
): Promise<ICommunityPlatformCommunityBannedUser> {
  const prepared: ICommunityPlatformCommunityBannedUser.ICreate =
    prepare_random_community_platform_community_banned_user(props.body);
  const result: ICommunityPlatformCommunityBannedUser =
    await api.functional.communityPlatform.moderator.community_banned_users.createCommunityBannedUser(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
