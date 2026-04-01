import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityUserAvatar } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAvatar";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_user_avatar } from "../prepare/prepare_random_reddit_community_user_avatar";

export async function generate_random_reddit_community_member_avatars_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityUserAvatar.ICreate>;
  },
): Promise<IRedditCommunityUserAvatar> {
  const prepared: IRedditCommunityUserAvatar.ICreate =
    prepare_random_reddit_community_user_avatar(props.body);
  const result: IRedditCommunityUserAvatar =
    await api.functional.redditCommunity.member.avatars.create(connection, {
      body: prepared,
    });
  return result;
}
