import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostAttachmentTransformer } from "../transformers/CommunityPlatformPostAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberPostsPostIdAttachmentsAttachmentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostAttachment.IUpdate;
}): Promise<ICommunityPlatformPostAttachment> {
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_platform_member_id: true,
        community_platform_community_id: true,
      },
    },
  );
  if (post.community_platform_member_id !== props.member.id) {
    const moderationRole =
      await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
        where: {
          community_platform_member_id: props.member.id,
          community_platform_community_id: post.community_platform_community_id,
          deleted_at: null,
        },
      });
    if (!moderationRole) {
      throw new HttpException("Forbidden", 403);
    }
  }
  await MyGlobal.prisma.community_platform_post_attachments.findUniqueOrThrow({
    where: {
      id: props.attachmentId,
      community_platform_post_id: props.postId,
    },
    select: { id: true },
  });
  const data: Record<string, any> = {
    updated_at: new Date(),
  };
  if (props.body.position !== undefined) {
    if (props.body.position < 0)
      throw new HttpException("Position must be non-negative", 400);
    data.position = props.body.position;
  }
  if (props.body.file_type !== undefined) {
    const validTypes = ["image", "document", "video", "audio"];
    if (!validTypes.includes(props.body.file_type)) {
      throw new HttpException("Invalid file_type", 400);
    }
    data.file_type = props.body.file_type;
  }
  if (props.body.original_filename !== undefined) {
    data.original_filename = props.body.original_filename;
  }
  if (props.body.file_size !== undefined) {
    if (props.body.file_size < 1)
      throw new HttpException("File size must be positive", 400);
    data.file_size = props.body.file_size;
  }
  if (props.body.mime_type !== undefined) {
    data.mime_type = props.body.mime_type;
  }
  await MyGlobal.prisma.community_platform_post_attachments.update({
    where: { id: props.attachmentId },
    data,
  });
  const updated =
    await MyGlobal.prisma.community_platform_post_attachments.findUniqueOrThrow(
      {
        where: { id: props.attachmentId },
        ...CommunityPlatformPostAttachmentTransformer.select(),
      },
    );
  return await CommunityPlatformPostAttachmentTransformer.transform(updated);
}
