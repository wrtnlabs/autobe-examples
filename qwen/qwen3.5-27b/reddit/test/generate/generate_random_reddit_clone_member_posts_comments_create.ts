import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_comment } from "../prepare/prepare_random_reddit_clone_comment";

/**
 * Generate a random comment on a Reddit clone post for E2E testing.
 *
 * Creates a new comment on the specified post using the postId parameter.
 * The comment can be a top-level comment (default) or a reply to an existing
 * comment by providing parentCommentId in the body. Prepares random comment
 * content using the prepare function, then calls the creation endpoint.
 *
 * The comment is automatically associated with the authenticated user's profile
 * and includes vote tracking capabilities. Comments support unlimited nesting
 * depth through reply threading.
 */
export async function generate_random_reddit_clone_member_posts_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneComment.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<IRedditCloneComment> {
  const prepared: IRedditCloneComment.ICreate =
    prepare_random_reddit_clone_comment(props.body);
  const result: IRedditCloneComment =
    await api.functional.redditClone.member.posts.comments.create(connection, {
      postId: props.params.postId,
      body: prepared,
    });
  return result;
}
