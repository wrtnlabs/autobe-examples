import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunityRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_community_role } from "../prepare/prepare_random_reddit_platform_community_role";

export async function generate_random_reddit_platform_moderator_communities_moderators_add_moderator(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformCommunityRole.ICreate> | undefined;
    params: {
      communityId: string;
    };
  },
): Promise<IRedditPlatformCommunityRole> {
  const prepared: IRedditPlatformCommunityRole.ICreate =
    prepare_random_reddit_platform_community_role(props.body);
  return await api.functional.redditPlatform.moderator.communities.moderators.addModerator(
    connection,
    {
      body: prepared,
      communityId: props.params.communityId,
    },
  );
}
