import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformModerationReportsResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReportsResolution";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformModerationReportsResolutionCollector } from "../collectors/CommunityPlatformModerationReportsResolutionCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformModerationReportsResolutionTransformer } from "../transformers/CommunityPlatformModerationReportsResolutionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminReportsReportIdResolutions(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationReportsResolution.ICreate;
}): Promise<ICommunityPlatformModerationReportsResolution> {
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  const adminRecord =
    await MyGlobal.prisma.community_platform_admins.findUnique({
      where: { id: props.admin.id },
    });
  if (!adminRecord) {
    throw new HttpException("Admin not found", 404);
  }
  const action = "approved";
  const created =
    await MyGlobal.prisma.community_platform_moderation_reports_resolutions.create(
      {
        data: await CommunityPlatformModerationReportsResolutionCollector.collect(
          {
            body: props.body,
            communityPlatformReports: { id: report.id },
            communityPlatformAdmins: { id: adminRecord.id },
            action,
          },
        ),
      },
    );
  return await CommunityPlatformModerationReportsResolutionTransformer.transform(
    created,
  );
}
