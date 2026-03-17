import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentAtSummaryTransformer } from "../transformers/CommunityPlatformCommentAtSummaryTransformer";
import { CommunityPlatformCommentTransformer } from "../transformers/CommunityPlatformCommentTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "../transformers/CommunityPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformPostsPostIdCommentsCommentId(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformComment> {
  // First, check if comment exists, belongs to post, and is not deleted
  const commentCheck =
    await MyGlobal.prisma.community_platform_comments.findUnique({
      where: { id: props.commentId },
      select: {
        id: true,
        community_platform_post_id: true,
        deleted_at: true,
      },
    });
  if (commentCheck === null) {
    throw new HttpException("Comment not found", 404);
  }
  if (commentCheck.community_platform_post_id !== props.postId) {
    throw new HttpException("Comment not found in this post", 404);
  }
  if (commentCheck.deleted_at !== null) {
    throw new HttpException("Comment has been deleted", 404);
  }
  // Define recursive select shape with sorting for replies (Best sorting by vote_score desc)
  interface ReplySelectShape {
    select: {
      id: true;
      content: true;
      vote_score: true;
      created_at: true;
      updated_at: true;
      deleted_at: true;
      author: ReturnType<
        typeof CommunityPlatformMemberAtSummaryTransformer.select
      >;
      parentComment: ReturnType<
        typeof CommunityPlatformCommentAtSummaryTransformer.select
      >;
      replies: ReplySelectShape;
    };
    orderBy: {
      vote_score: "desc";
    };
  }
  const replySelect: ReplySelectShape = {
    select: {
      id: true,
      content: true,
      vote_score: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      author: CommunityPlatformMemberAtSummaryTransformer.select(),
      parentComment: CommunityPlatformCommentAtSummaryTransformer.select(),
      replies: undefined as unknown as ReplySelectShape,
    },
    orderBy: { vote_score: "desc" },
  };
  replySelect.select.replies = replySelect;
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        content: true,
        vote_score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: CommunityPlatformMemberAtSummaryTransformer.select(),
        parentComment: CommunityPlatformCommentAtSummaryTransformer.select(),
        replies: replySelect,
      },
    });
  return await CommunityPlatformCommentTransformer.transform(comment as any);
}
