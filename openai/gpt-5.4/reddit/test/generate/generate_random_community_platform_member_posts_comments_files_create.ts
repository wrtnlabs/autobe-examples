import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_comment_file } from "../prepare/prepare_random_community_platform_comment_file";

export async function generate_random_community_platform_member_posts_comments_files_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommentFile.ICreate> | undefined;
    params: {
      postId: string;
      commentId: string;
    };
  },
): Promise<ICommunityPlatformCommentFile> {
  const prepared: ICommunityPlatformCommentFile.ICreate =
    prepare_random_community_platform_comment_file(props.body);
  const result: ICommunityPlatformCommentFile =
    await api.functional.communityPlatform.member.posts.comments.files.create(
      connection,
      {
        body: prepared,
        postId: props.params.postId,
        commentId: props.params.commentId,
      },
    );
  return result;
}
