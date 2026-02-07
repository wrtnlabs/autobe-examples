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

export async function postCommunityPlatformAdminResolutions(props: {
  admin: AdminPayload;
  body: ICommunityPlatformModerationReportsResolution.ICreate;
}): Promise<ICommunityPlatformModerationReportsResolution> {
  // Type assertion to make TypeScript happy
  const body = props.body as {
    action: "approved" | "dismissed" | "escalated";
    communityPlatformReportId: string;
  };
  // Validate action values
  const allowedActions = ["approved", "dismissed", "escalated"];
  if (!allowedActions.includes(body.action)) {
    throw new HttpException("Invalid action value", 400);
  }
  // Fetch report resource
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: body.communityPlatformReportId },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  // Validate admin exists and is active
  const admin = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: { id: props.admin.id, deleted_at: null },
  });
  if (!admin) {
    throw new HttpException("Admin not found", 404);
  }
  // Create resolution record
  const created =
    await MyGlobal.prisma.community_platform_moderation_reports_resolutions.create(
      {
        data: await CommunityPlatformModerationReportsResolutionCollector.collect(
          {
            body: props.body,
            communityPlatformReports: report,
            communityPlatformAdmins: admin,
            action: body.action,
          },
        ),
        ...CommunityPlatformModerationReportsResolutionTransformer.select(),
      },
    );
  // Transform to API DTO
  return await CommunityPlatformModerationReportsResolutionTransformer.transform(
    created,
  );
}
