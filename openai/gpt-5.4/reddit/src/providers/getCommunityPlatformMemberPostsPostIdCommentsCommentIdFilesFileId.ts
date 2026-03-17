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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentFileTransformer } from "../transformers/CommunityPlatformCommentFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberPostsPostIdCommentsCommentIdFilesFileId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentFile> {
  const file =
    await MyGlobal.prisma.community_platform_comment_files.findFirstOrThrow({
      where: {
        id: props.fileId,
        deleted_at: null,
        community_platform_comment_id: props.commentId,
        comment: {
          id: props.commentId,
          post: {
            id: props.postId,
          },
        },
      },
      ...CommunityPlatformCommentFileTransformer.select(),
    });
  return await CommunityPlatformCommentFileTransformer.transform(file);
}
