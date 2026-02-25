import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityCommentCollector } from "../collectors/CommunityCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityCommentTransformer } from "../transformers/CommunityCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberCommentsCommentIdReplies(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityComment.ICreate;
}): Promise<ICommunityComment> {
  // 1. Fetch parent comment and validate
  const parentComment =
    await MyGlobal.prisma.community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        community_post_id: true,
        is_deleted: true,
      },
    });
  // Check if parent comment is deleted
  if (parentComment.is_deleted) {
    throw new HttpException("Cannot reply to a deleted comment", 400);
  }
  // 2. Fetch post to get community_id
  const post = await MyGlobal.prisma.community_posts.findUniqueOrThrow({
    where: { id: parentComment.community_post_id },
    select: {
      id: true,
      community_id: true,
    },
  });
  // 3. Check if member is banned from the community
  const now = new Date();
  const ban = await MyGlobal.prisma.community_bans.findFirst({
    where: {
      community_id: post.community_id,
      member_id: props.member.id,
      OR: [
        { expired_at: null }, // Permanent ban
        { expired_at: { gt: now } }, // Not yet expired
      ],
    },
  });
  if (ban !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // 4. Create the reply comment using collector
  const createInput = await CommunityCommentCollector.collect({
    body: props.body,
    communityPosts: { id: post.id },
    communityMembers: { id: props.member.id },
  });
  const created = await MyGlobal.prisma.community_comments.create({
    data: {
      ...createInput,
      parent: { connect: { id: parentComment.id } },
    },
    ...CommunityCommentTransformer.select(),
  });
  // 5. Increment post comment count
  await MyGlobal.prisma.community_posts.update({
    where: { id: post.id },
    data: {
      comment_count: { increment: 1 },
      updated_at: new Date(),
    },
  });
  // 6. Transform and return
  return await CommunityCommentTransformer.transform(created);
}
