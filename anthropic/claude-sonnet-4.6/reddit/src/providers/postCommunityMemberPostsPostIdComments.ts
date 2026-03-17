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
import { CommunityCommentCollector } from "../collectors/CommunityCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityCommentTransformer } from "../transformers/CommunityCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityComment.ICreate;
}): Promise<ICommunityComment> {
  // Step 1: Fetch the target post (404 if not found or deleted)
  const post = await MyGlobal.prisma.community_posts.findFirstOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_community_id: true,
    },
  });
  // Step 2: Ban check — reject if member has an active ban in this community
  const activeBan = await MyGlobal.prisma.community_bans.findFirst({
    where: {
      community_id: post.community_community_id,
      banned_member_id: props.member.id,
      status: "active",
    },
    select: { id: true },
  });
  if (activeBan !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Step 3: Validate parent_id if provided
  if (props.body.parent_id != null) {
    const parentComment = await MyGlobal.prisma.community_comments.findFirst({
      where: {
        id: props.body.parent_id,
        post_id: props.postId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (parentComment === null) {
      throw new HttpException(
        "Parent comment not found or does not belong to this post",
        422,
      );
    }
  }
  // Step 4: Create the comment using the collector
  const created = await MyGlobal.prisma.community_comments.create({
    data: await CommunityCommentCollector.collect({
      body: props.body,
      communityPosts: { id: post.id },
      communityMembers: { id: props.member.id },
      communityMemberSessions: { id: props.member.session_id },
    }),
    ...CommunityCommentTransformer.select(),
  });
  // Step 5: Transform and return
  return await CommunityCommentTransformer.transform(created);
}
