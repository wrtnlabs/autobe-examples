import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserBan";
import { prepare_random_community_bbs_user_ban } from "../prepare/prepare_random_community_bbs_user_ban";
export async function generate_random_community_bbs_moderator_users_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsUserBan.ICreate>;
  },
): Promise<void> {
  const prepared: ICommunityBbsUserBan.ICreate =
    prepare_random_community_bbs_user_ban(props.body);
  return await api.functional.communityBbs.moderator.users.bans.create(
    connection,
    {
      body: prepared,
    },
  );
}
