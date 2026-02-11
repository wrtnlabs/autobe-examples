import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { IRedditPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportResolution";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformReportResolutionTransformer } from "../transformers/RedditPlatformReportResolutionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditPlatformAdminRedditPlatformReportResolutionsResolutionId(props: {
  admin: AdminPayload;
  resolutionId: string;
  body: IRedditPlatformReportResolution.IUpdate;
}): Promise<IRedditPlatformReportResolution> {
  const existing =
    await MyGlobal.prisma.reddit_platform_report_resolutions.findUnique({
      where: { id: props.resolutionId },
    });
  if (!existing) throw new HttpException("Resolution not found", 404);
  const updated =
    await MyGlobal.prisma.reddit_platform_report_resolutions.update({
      where: { id: props.resolutionId },
      data: {
        status: props.body.status,
        resolution_notes: props.body.resolution_notes ?? null,
        resolved_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
      ...RedditPlatformReportResolutionTransformer.select(),
    });
  return await RedditPlatformReportResolutionTransformer.transform(updated);
}
