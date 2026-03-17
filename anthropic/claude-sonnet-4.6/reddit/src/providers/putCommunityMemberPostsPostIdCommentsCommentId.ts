import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityCommentTransformer } from "../transformers/CommunityCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityComment.IUpdate;
}): Promise<ICommunityComment> {
  // Step 1: Verify post exists and is not deleted, get community_id for ban check
  const post = await MyGlobal.prisma.community_posts.findFirstOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      community_community_id: true,
    },
  });
  // Step 2: Verify comment exists, belongs to the post, and is not deleted
  const comment = await MyGlobal.prisma.community_comments.findFirstOrThrow({
    where: {
      id: props.commentId,
      post_id: props.postId,
      deleted_at: null,
    },
    select: {
      member_id: true,
    },
  });
  // Step 3: Verify the requesting member is the comment author
  if (comment.member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: You are not the author of this comment",
      403,
    );
  }
  // Step 4: Check if member is banned from the community where the post resides
  const activeBan = await MyGlobal.prisma.community_bans.findFirst({
    where: {
      banned_member_id: props.member.id,
      community_id: post.community_community_id,
      status: "active",
    },
    select: { id: true },
  });
  if (activeBan !== null) {
    throw new HttpException(
      "Forbidden: You are banned from this community",
      403,
    );
  }
  // Step 5: Perform the update
  await MyGlobal.prisma.community_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content,
      updated_at: new Date(),
    },
  });
  // Step 6: Fetch updated record and transform to response DTO
  const updated = await MyGlobal.prisma.community_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    ...CommunityCommentTransformer.select(),
  });
  return CommunityCommentTransformer.transform(updated);
}
