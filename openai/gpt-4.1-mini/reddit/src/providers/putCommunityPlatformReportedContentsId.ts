import { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformReportedContentsId(props: {
  id: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportedContent.IUpdate;
}): Promise<ICommunityPlatformReportedContent> {
  const record =
    await MyGlobal.prisma.community_platform_reported_contents.findUnique({
      where: { id: props.id },
    });
  if (!record) throw new HttpException("Reported content link not found", 404);
  const updated =
    await MyGlobal.prisma.community_platform_reported_contents.update({
      where: { id: props.id },
      data: {},
    });
  return {
    id: updated.id,
    community_platform_report_id: updated.community_platform_report_id ?? null,
    community_platform_reported_post_id:
      updated.community_platform_reported_post_id ?? null,
    community_platform_reported_comment_id:
      updated.community_platform_reported_comment_id ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
