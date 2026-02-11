import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_post } from "../prepare/prepare_random_reddit_platform_post";

export async function generate_random_reddit_platform_member_posts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformPost.ICreate>;
  },
): Promise<IRedditPlatformPost> {
  const prepared: IRedditPlatformPost.ICreate =
    prepare_random_reddit_platform_post(props.body);
  return await api.functional.redditPlatform.member.posts.create(connection, {
    body: prepared,
  });
}
