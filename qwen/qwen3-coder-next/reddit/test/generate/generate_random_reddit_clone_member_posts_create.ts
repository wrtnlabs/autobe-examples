import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_content_post } from "../prepare/prepare_random_reddit_clone_content_post";

export async function generate_random_reddit_clone_member_posts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneContentPost.ICreate>;
  },
): Promise<IRedditCloneContentPost> {
  const prepared: IRedditCloneContentPost.ICreate =
    prepare_random_reddit_clone_content_post(props.body);
  const result: IRedditCloneContentPost =
    await api.functional.redditClone.member.posts.create(connection, {
      body: prepared,
    });
  return result;
}
