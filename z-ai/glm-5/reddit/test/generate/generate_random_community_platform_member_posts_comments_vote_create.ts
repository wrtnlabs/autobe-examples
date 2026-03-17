import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_comment_vote } from "../prepare/prepare_random_community_platform_comment_vote";

export async function generate_random_community_platform_member_posts_comments_vote_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommentVote.ICreate>;
    params: {
      postId: string;
      commentId: string;
    };
  },
): Promise<ICommunityPlatformCommentVote> {
  const prepared: ICommunityPlatformCommentVote.ICreate =
    prepare_random_community_platform_comment_vote(props.body);
  const result: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.member.posts.comments.vote.create(
      connection,
      {
        body: prepared,
        postId: props.params.postId,
        commentId: props.params.commentId,
      },
    );
  return result;
}
