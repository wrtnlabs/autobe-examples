import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_post } from "../prepare/prepare_random_reddit_community_post";

export async function generate_random_reddit_community_member_posts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityPost.ICreate> | undefined;
  },
): Promise<IRedditCommunityPost> {
  const prepared: IRedditCommunityPost.ICreate =
    prepare_random_reddit_community_post(props.body);
  const result: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: prepared,
    });
  return result;
}
