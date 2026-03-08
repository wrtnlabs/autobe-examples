import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_moderator_role } from "../prepare/prepare_random_reddit_like_moderator_role";

export async function generate_random_reddit_like_member_communities_moderators_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeModeratorRole.ICreate> | undefined;
    params?: {
      communityName: string;
    };
  },
): Promise<IRedditLikeModeratorRole> {
  const prepared: IRedditLikeModeratorRole.ICreate =
    prepare_random_reddit_like_moderator_role(props.body);
  const result: IRedditLikeModeratorRole =
    await api.functional.redditLike.member.communities.moderators.create(
      connection,
      {
        communityName: props.params!.communityName!,
        body: prepared,
      },
    );
  return result;
}