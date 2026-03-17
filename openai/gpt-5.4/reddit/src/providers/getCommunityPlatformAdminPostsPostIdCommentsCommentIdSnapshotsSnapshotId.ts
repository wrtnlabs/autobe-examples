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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommentSnapshotTransformer } from "../transformers/CommunityPlatformCommentSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminPostsPostIdCommentsCommentIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentSnapshot> {
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.community_platform_comments.findFirstOrThrow({
    where: {
      id: props.commentId,
      community_platform_post_id: props.postId,
    },
    select: {
      id: true,
      community_platform_post_id: true,
      status: true,
      deleted_at: true,
      parent_id: true,
      community_platform_member_id: true,
    },
  });
  const snapshot =
    await MyGlobal.prisma.community_platform_comment_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          community_platform_comment_id: props.commentId,
        },
        ...CommunityPlatformCommentSnapshotTransformer.select(),
      },
    );
  return await CommunityPlatformCommentSnapshotTransformer.transform(snapshot);
}
