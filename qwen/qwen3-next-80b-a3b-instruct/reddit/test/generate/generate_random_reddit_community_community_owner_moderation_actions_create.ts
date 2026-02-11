import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityModerationActionOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationActionOfPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_moderation_action_of_post } from "../prepare/prepare_random_reddit_community_moderation_action_of_post";

export async function generate_random_reddit_community_community_owner_moderation_actions_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IRedditCommunityModerationActionOfPost.ICreate>
      | undefined;
  },
): Promise<void> {
  const prepared: IRedditCommunityModerationActionOfPost.ICreate =
    prepare_random_reddit_community_moderation_action_of_post(props.body);
  return await api.functional.redditCommunity.communityOwner.moderation_actions.create(
    connection,
    {
      body: prepared,
    },
  );
}
