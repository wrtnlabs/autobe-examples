import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityReportTransformer } from "../transformers/CommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityReport> {
  const report = await MyGlobal.prisma.community_reports.findUnique({
    where: { id: props.reportId, deleted_at: null },
    ...CommunityReportTransformer.select().select,
  });
  if (!report) throw new HttpException("Report not found", 404);
  return await CommunityReportTransformer.transform(report);
}
