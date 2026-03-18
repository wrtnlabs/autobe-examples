import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_post_vote_comment } from "../prepare/prepare_random_community_platform_post_vote_comment";

export async function generate_random_community_platform_member_posts_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformPostVoteComment.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<ICommunityPlatformPostVoteComment> {
  const prepared: ICommunityPlatformPostVoteComment.ICreate =
    prepare_random_community_platform_post_vote_comment(props.body);
  return await api.functional.communityPlatform.member.posts.comments.create(
    connection,
    {
      body: prepared,
      postId: props.params.postId,
    },
  );
}
