import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_moderator } from "../prepare/prepare_random_reddit_clone_moderator";

export async function generate_random_reddit_clone_member_communities_moderators_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneModerator.ICreate>;
    params: {
      communityId: string;
    };
  },
): Promise<IRedditCloneModerator> {
  const prepared: IRedditCloneModerator.ICreate =
    prepare_random_reddit_clone_moderator(props.body);
  const result: IRedditCloneModerator =
    await api.functional.redditClone.member.communities.moderators.create(
      connection,
      {
        communityId: props.params.communityId,
        body: prepared,
      },
    );
  return result;
}
