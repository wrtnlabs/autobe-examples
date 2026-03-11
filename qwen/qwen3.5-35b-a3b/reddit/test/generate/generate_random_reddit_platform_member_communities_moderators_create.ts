import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_community_moderator } from "../prepare/prepare_random_reddit_platform_community_moderator";

export async function generate_random_reddit_platform_member_communities_moderators_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformCommunityModerator.ICreate> | undefined;
    params?: {
      communityId: string;
    };
  },
): Promise<IRedditPlatformCommunityModerator> {
  const prepared: IRedditPlatformCommunityModerator.ICreate =
    prepare_random_reddit_platform_community_moderator(props.body);
  const result: IRedditPlatformCommunityModerator =
    await api.functional.redditPlatform.member.communities.moderators.create(
      connection,
      {
        body: prepared,
        communityId: props.params?.communityId ?? "00000000-0000-0000-0000-000000000000",
      },
    );
  return result;
}