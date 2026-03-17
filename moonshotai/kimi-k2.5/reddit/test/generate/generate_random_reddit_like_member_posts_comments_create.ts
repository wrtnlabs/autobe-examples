import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_comment } from "../prepare/prepare_random_reddit_like_comment";

export async function generate_random_reddit_like_member_posts_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeComment.ICreate>;
    params?: {
      postId: string;
    };
  },
): Promise<IRedditLikeComment> {
  const prepared: IRedditLikeComment.ICreate =
    prepare_random_reddit_like_comment(props.body);
  const result: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.create(connection, {
      postId: (props.params?.postId ?? typia.random<string & tags.Format<"uuid">>()),
      body: prepared,
    });
  return result;
}