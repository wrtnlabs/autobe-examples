import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformDeletedPostPlaceholders } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedPostPlaceholders";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminPostsPostIdDeletedPlaceholder(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformDeletedPostPlaceholders> {
  const placeholder =
    await MyGlobal.prisma.community_platform_deleted_post_placeholders.findFirst(
      {
        where: { community_platform_post_id: props.postId },
      },
    );
  if (!placeholder) {
    throw new HttpException("Placeholder not found for this postId", 404);
  }
  return {
    id: placeholder.id,
    community_platform_post_id: placeholder.community_platform_post_id,
    placeholder_type: (placeholder as any).placeholder_type ?? "",
    masked_by_user_id: (placeholder as any).masked_by_user_id ?? undefined,
    masked_reason: (placeholder as any).masked_reason ?? undefined,
    placeholder_message: placeholder.placeholder_message,
    created_at: toISOStringSafe(placeholder.created_at),
  };
}
