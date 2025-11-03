import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityEditHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminCommunitiesCommunityIdEditHistoriesEditHistoryId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  editHistoryId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityEditHistory> {
  const record =
    await MyGlobal.prisma.community_platform_community_edit_histories.findFirst(
      {
        where: {
          id: props.editHistoryId,
          community_platform_community_id: props.communityId,
        },
      },
    );
  if (!record) {
    throw new HttpException("Edit history record not found", 404);
  }
  return {
    id: record.id,
    community_platform_community_id: record.community_platform_community_id,
    editor_user_id: record.editor_user_id,
    name: record.name,
    description: record.description,
    edited_at: toISOStringSafe(record.edited_at),
  };
}
