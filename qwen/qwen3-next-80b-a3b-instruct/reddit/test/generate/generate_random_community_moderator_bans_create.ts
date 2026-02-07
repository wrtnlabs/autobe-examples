import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_banned_user } from "../prepare/prepare_random_community_banned_user";

export async function generate_random_community_moderator_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBannedUser.ICreate> | undefined;
  },
): Promise<ICommunityBannedUser> {
  const prepared: ICommunityBannedUser.ICreate =
    prepare_random_community_banned_user(props.body);
  return await api.functional.community.moderator.bans.create(connection, {
    body: prepared,
  });
}
