import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommentFileTransformer } from "../transformers/CommunityPlatformCommentFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminPostsPostIdCommentsCommentIdFilesFileId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentFile> {
  props.admin;
  const file =
    await MyGlobal.prisma.community_platform_comment_files.findFirstOrThrow({
      where: {
        id: props.fileId,
        deleted_at: null,
        community_platform_comment_id: props.commentId,
        comment: {
          id: props.commentId,
          community_platform_post_id: props.postId,
          deleted_at: null,
          post: {
            id: props.postId,
            deleted_at: null,
          },
        },
      },
      ...CommunityPlatformCommentFileTransformer.select(),
    });
  return await CommunityPlatformCommentFileTransformer.transform(file);
}
