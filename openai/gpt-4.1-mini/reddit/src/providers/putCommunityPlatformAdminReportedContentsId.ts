import { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformReportedContentTransformer } from "../transformers/CommunityPlatformReportedContentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminReportedContentsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportedContent.IUpdate;
}): Promise<ICommunityPlatformReportedContent> {
  const id = props.id;
  const {
    community_platform_report_id,
    community_platform_reported_post_id,
    community_platform_reported_comment_id,
  } = props.body;
  // Check existence
  await MyGlobal.prisma.community_platform_reported_contents.findUniqueOrThrow({
    where: { id },
  });
  // Get updated_at as iso string
  const updatedAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  // Update record
  const updatedRecord =
    await MyGlobal.prisma.community_platform_reported_contents.update({
      where: { id },
      data: {
        community_platform_report_id: community_platform_report_id ?? null,
        community_platform_reported_post_id:
          community_platform_reported_post_id ?? null,
        community_platform_reported_comment_id:
          community_platform_reported_comment_id ?? null,
        updated_at: updatedAt,
      },
      ...CommunityPlatformReportedContentTransformer.select(),
    });
  // Transform and map the DB record to DTO with date strings
  return await CommunityPlatformReportedContentTransformer.transform(
    updatedRecord,
  );
}
