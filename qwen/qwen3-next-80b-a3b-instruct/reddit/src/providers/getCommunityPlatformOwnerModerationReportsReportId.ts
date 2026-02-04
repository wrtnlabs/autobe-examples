import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { CommunityPlatformReportTransformer } from "../transformers/CommunityPlatformReportTransformer";

export async function getCommunityPlatformOwnerModerationReportsReportId(props: {
  owner: OwnerPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
    ...CommunityPlatformReportTransformer.select(),
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  // Authorization: Only owners can access reports
  // This is enforced at the endpoint level - the owner parameter
  // is guaranteed to be a valid OwnerPayload due to Auth middleware
  // No additional validation needed beyond parameter existence
  return await CommunityPlatformReportTransformer.transform(report);
}
