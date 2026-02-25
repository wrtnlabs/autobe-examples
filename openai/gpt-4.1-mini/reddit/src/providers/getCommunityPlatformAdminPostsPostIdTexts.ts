import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminPostsPostIdTexts(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostText> {
  const textRecord =
    await MyGlobal.prisma.community_platform_post_texts.findFirst({
      where: {
        community_platform_post_id: props.postId,
        deleted_at: null,
        post: {
          post_type: "text",
          deleted_at: null,
        },
      },
    });
  if (textRecord === null) {
    throw new HttpException("Not Found", 404);
  }
  const createdAt = textRecord.created_at.toISOString() as unknown as string &
    tags.Format<"date-time">;
  const updatedAt = textRecord.updated_at.toISOString() as unknown as string &
    tags.Format<"date-time">;
  const deletedAt = textRecord.deleted_at
    ? (textRecord.deleted_at.toISOString() as unknown as string &
        tags.Format<"date-time">)
    : null;
  return {
    id: textRecord.id,
    communityPlatformPostId: textRecord.community_platform_post_id,
    content: textRecord.content,
    createdAt,
    updatedAt,
    deletedAt,
  };
}
