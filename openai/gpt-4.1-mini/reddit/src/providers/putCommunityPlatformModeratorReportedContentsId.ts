import { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformReportedContentTransformer } from "../transformers/CommunityPlatformReportedContentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformModeratorReportedContentsId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportedContent.IUpdate;
}): Promise<ICommunityPlatformReportedContent> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updatedRecord =
    await MyGlobal.prisma.community_platform_reported_contents.update({
      where: { id: props.id },
      data: {
        community_platform_report_id: props.body.community_platform_report_id,
        community_platform_reported_post_id:
          props.body.community_platform_reported_post_id ?? null,
        community_platform_reported_comment_id:
          props.body.community_platform_reported_comment_id ?? null,
        updated_at: now,
      },
      ...CommunityPlatformReportedContentTransformer.select(),
    });
  return await CommunityPlatformReportedContentTransformer.transform(
    updatedRecord,
  );
}
