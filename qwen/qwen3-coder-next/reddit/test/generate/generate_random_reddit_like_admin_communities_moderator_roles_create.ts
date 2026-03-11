import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_moderator_role } from "../prepare/prepare_random_reddit_like_moderator_role";

export async function generate_random_reddit_like_admin_communities_moderator_roles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeModeratorRole.ICreate> | undefined;
    params: {
      communityId: string;
    };
  },
): Promise<IRedditLikeModeratorRole> {
  const prepared: IRedditLikeModeratorRole.ICreate =
    prepare_random_reddit_like_moderator_role(props.body);
  return await api.functional.redditLike.admin.communities.moderator_roles.create(
    connection,
    {
      body: prepared,
      communityId: props.params.communityId,
    },
  );
}
