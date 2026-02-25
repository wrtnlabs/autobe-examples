import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformReportTransformer } from "../transformers/CommunityPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReport.IUpdate;
}): Promise<ICommunityPlatformReport> {
  const updatedReport = await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
    });
    const dataToUpdate: Prisma.community_platform_reportsUpdateInput = {
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    };
    if (props.body.status !== undefined) {
      // Use Prisma's StringFieldUpdateOperationsInput format with set and allow undefined to clear
      dataToUpdate.status = { set: props.body.status ?? undefined };
    }
    if (props.body.description !== undefined) {
      dataToUpdate.description = { set: props.body.description ?? undefined };
    }
    if (props.body.status === "approved") {
      // Delete related reported contents; DB cascade deletes content
      await prisma.community_platform_reported_contents.deleteMany({
        where: { community_platform_report_id: props.reportId },
      });
    }
    await prisma.community_platform_reports.update({
      where: { id: props.reportId },
      data: dataToUpdate,
    });
    return await prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...CommunityPlatformReportTransformer.select(),
    });
  });
  return await CommunityPlatformReportTransformer.transform(updatedReport);
}
