import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_moderator } from "../prepare/prepare_random_reddit_community_moderator";

export async function generate_random_reddit_community_platform_admin_community_moderators_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityModerator.ICreate> | undefined;
  },
): Promise<IRedditCommunityModerator> {
  const prepared: IRedditCommunityModerator.ICreate =
    prepare_random_reddit_community_moderator(props.body);
  return await api.functional.redditCommunity.platformAdmin.community_moderators.create(
    connection,
    {
      body: prepared,
    },
  );
}
