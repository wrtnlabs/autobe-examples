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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformReportResolutionTransformer } from "../transformers/RedditPlatformReportResolutionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberRedditPlatformReportResolutionsResolutionId(props: {
  member: MemberPayload;
  resolutionId: string;
}): Promise<IRedditPlatformReportResolution> {
  const resolution =
    await MyGlobal.prisma.reddit_platform_report_resolutions.findUnique({
      where: { id: props.resolutionId },
      ...RedditPlatformReportResolutionTransformer.select(),
    });
  if (!resolution) throw new HttpException("Resolution not found", 404);
  return await RedditPlatformReportResolutionTransformer.transform(resolution);
}
