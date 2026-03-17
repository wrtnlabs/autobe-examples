import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_post_snapshot } from "../prepare/prepare_random_reddit_clone_post_snapshot";

export async function generate_random_reddit_clone_member_posts_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditClonePostSnapshot.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<IRedditClonePostSnapshot> {
  const prepared: IRedditClonePostSnapshot.ICreate =
    prepare_random_reddit_clone_post_snapshot(props.body);
  const result: IRedditClonePostSnapshot =
    await api.functional.redditClone.member.posts.snapshots.create(connection, {
      body: prepared,
      postId: props.params.postId,
    });
  return result;
}
