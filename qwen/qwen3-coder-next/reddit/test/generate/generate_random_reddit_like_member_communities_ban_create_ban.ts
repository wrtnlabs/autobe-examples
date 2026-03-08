import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_ban } from "../prepare/prepare_random_reddit_like_ban";

export async function generate_random_reddit_like_member_communities_ban_create_ban(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeBan.ICreate>;
    params: {
      communityName: string;
      username: string;
    };
  },
): Promise<IRedditLikeBan> {
  const prepared: IRedditLikeBan.ICreate = prepare_random_reddit_like_ban(
    props.body,
  );
  return await api.functional.redditLike.member.communities.ban.createBan(
    connection,
    {
      body: prepared,
      communityName: props.params.communityName,
      username: props.params.username,
    },
  );
}
