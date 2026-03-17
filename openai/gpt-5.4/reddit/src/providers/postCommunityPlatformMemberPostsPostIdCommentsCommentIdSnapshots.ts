import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentSnapshotTransformer } from "../transformers/CommunityPlatformCommentSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPostsPostIdCommentsCommentIdSnapshots(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentSnapshot> {
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        community_platform_post_id: true,
      },
    });
  if (comment.community_platform_post_id !== props.postId) {
    throw new HttpException("Comment not found", 404);
  }
  const created =
    await MyGlobal.prisma.community_platform_comment_snapshots.create({
      data: {
        id: v4(),
        comment: {
          connect: {
            id: comment.id,
          },
        },
      },
      ...CommunityPlatformCommentSnapshotTransformer.select(),
    });
  return await CommunityPlatformCommentSnapshotTransformer.transform(created);
}
