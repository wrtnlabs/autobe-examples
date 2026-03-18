import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostVoteCommentTransformer } from "../transformers/CommunityPlatformPostVoteCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVoteComment.ICreate;
}): Promise<ICommunityPlatformPostVoteComment> {
  if (props.body.bodyText.trim().length === 0) {
    throw new HttpException("Body text is required", 400);
  }
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const post = await tx.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: { id: true, community_id: true },
    });
    const subscription =
      await tx.community_platform_community_subscriptions.findFirst({
        where: {
          member_id: props.member.id,
          community_id: post.community_id,
          is_active: true,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (subscription === null) {
      throw new HttpException("Forbidden", 403);
    }
    const parentCommentId =
      props.body.parentCommentId === undefined
        ? null
        : props.body.parentCommentId;
    if (parentCommentId !== null) {
      const parent = await tx.community_platform_comments.findUniqueOrThrow({
        where: { id: parentCommentId },
        select: { community_platform_post_id: true },
      });
      if (parent.community_platform_post_id !== props.postId) {
        throw new HttpException("Invalid parent comment", 400);
      }
    }
    const now = toISOStringSafe(new Date());
    const created = await tx.community_platform_comments.create({
      data: {
        id: v4(),
        posted_at: now,
        body_text: props.body.bodyText,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        post: { connect: { id: props.postId } },
        parentComment:
          parentCommentId !== null
            ? { connect: { id: parentCommentId } }
            : undefined,
        author: { connect: { id: props.member.id } },
        editedBy: undefined,
        deletedBy: undefined,
      },
      select: CommunityPlatformPostVoteCommentTransformer.select().select,
    });
    return { created };
  });
  return await CommunityPlatformPostVoteCommentTransformer.transform(
    result.created,
  );
}
