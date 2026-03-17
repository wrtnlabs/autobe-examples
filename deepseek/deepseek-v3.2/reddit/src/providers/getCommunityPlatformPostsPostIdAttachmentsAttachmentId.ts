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
import { CommunityPlatformPostAttachmentTransformer } from "../transformers/CommunityPlatformPostAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformPostsPostIdAttachmentsAttachmentId(props: {
  postId: string;
  attachmentId: string;
}): Promise<ICommunityPlatformPostAttachment> {
  const attachment =
    await MyGlobal.prisma.community_platform_post_attachments.findFirst({
      where: {
        id: props.attachmentId,
        community_platform_post_id: props.postId,
        deleted_at: null,
      },
      ...CommunityPlatformPostAttachmentTransformer.select(),
    });
  if (attachment === null) {
    throw new HttpException(
      "Attachment not found or does not belong to the specified post",
      404,
    );
  }
  return await CommunityPlatformPostAttachmentTransformer.transform(attachment);
}
