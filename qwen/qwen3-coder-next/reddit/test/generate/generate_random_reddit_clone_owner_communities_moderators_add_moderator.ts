import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorAssignment";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_moderator_assignment } from "../prepare/prepare_random_reddit_clone_moderator_assignment";

export async function generate_random_reddit_clone_owner_communities_moderators_add_moderator(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneModeratorAssignment.ICreate> | undefined;
    params: {
      communityId: string;
    };
  },
): Promise<IRedditCloneModeratorAssignment> {
  const prepared: IRedditCloneModeratorAssignment.ICreate =
    prepare_random_reddit_clone_moderator_assignment(props.body);
  return await api.functional.redditClone.owner.communities.moderators.addModerator(
    connection,
    {
      body: prepared,
      communityId: props.params.communityId,
    },
  );
}
