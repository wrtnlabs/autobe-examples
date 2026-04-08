import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_post_snapshot } from "../prepare/prepare_random_reddit_clone_post_snapshot";

/**
 * Generate a random post snapshot via the API for E2E testing.
 *
 * Creates a point-in-time snapshot of a post's current state for edit history and audit trail purposes. The snapshot captures the complete state of the specified post at the moment of creation, including title, content type, and all content fields.
 *
 * Requires a valid postId parameter referencing an existing post. The snapshot is immutable and preserves the post data as it existed at the time of snapshot creation.
 */
export async function generate_random_reddit_clone_posts_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditClonePostSnapshot.ICreate>;
    params: {
      postId: string;
    };
  },
): Promise<IRedditClonePostSnapshot> {
  const prepared: IRedditClonePostSnapshot.ICreate =
    prepare_random_reddit_clone_post_snapshot(props.body);
  const result: IRedditClonePostSnapshot =
    await api.functional.redditClone.posts.snapshots.create(connection, {
      postId: props.params.postId,
      body: prepared,
    });
  return result;
}
