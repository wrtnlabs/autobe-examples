import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentCollector } from "../collectors/CommunityPlatformCommentCollector";
import { CommunityPlatformCommentTransformer } from "../transformers/CommunityPlatformCommentTransformer";

export async function postCommunityPlatformMemberCommentsCommentIdReplies(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.ICreate;
}): Promise<ICommunityPlatformComment> {
  // Verify parent comment exists
  const parentComment =
    await MyGlobal.prisma.community_platform_comments.findUnique({
      where: { id: props.commentId },
      select: { parent: true },
    });
  if (!parentComment) {
    throw new HttpException("Parent comment not found", 404);
  }
  // Use Collector to transform API DTO into Prisma CreateInput
  const created = await MyGlobal.prisma.community_platform_comments.create({
    data: await CommunityPlatformCommentCollector.collect({
      body: props.body,
      communityPlatformMembers: { id: props.member.id },
      communityPlatformMemberSessions: { id: props.member.session_id },
    }),
    select: CommunityPlatformCommentTransformer.select().select,
  });
  // Transform and return response
  return await CommunityPlatformCommentTransformer.transform(created);
}
