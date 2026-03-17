import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_ban } from "../prepare/prepare_random_reddit_clone_ban";

export async function generate_random_reddit_clone_member_communities_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneBan.ICreate>;
    params: {
      communityId: string;
    };
  },
): Promise<IRedditCloneBan> {
  const prepared: IRedditCloneBan.ICreate = prepare_random_reddit_clone_ban(
    props.body,
  );
  const result: IRedditCloneBan =
    await api.functional.redditClone.member.communities.bans.create(
      connection,
      {
        communityId: props.params.communityId,
        body: prepared,
      },
    );
  return result;
}
