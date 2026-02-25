import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentFull } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentFull";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_comment } from "../prepare/prepare_random_reddit_community_comment";

export async function generate_random_reddit_community_posts_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityComment.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<IRedditCommunityCommentFull> {
  const prepared: IRedditCommunityComment.ICreate =
    prepare_random_reddit_community_comment(props.body);
  return await api.functional.redditCommunity.posts.comments.create(
    connection,
    {
      body: prepared,
      postId: props.params.postId,
    },
  );
}
