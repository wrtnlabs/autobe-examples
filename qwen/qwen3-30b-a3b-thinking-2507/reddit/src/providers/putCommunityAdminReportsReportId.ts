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

export async function putCommunityAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string;
  body: ICommunityReport.IUpdate;
}): Promise<ICommunityReport> {
  const report = await MyGlobal.prisma.community_reports.findUnique({
    where: { id: props.reportId, deleted_at: null },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  if (report.status !== "pending") {
    throw new HttpException("Report must be pending to update", 400);
  }
  await MyGlobal.prisma.community_reports.update({
    where: { id: props.reportId, deleted_at: null },
    data: {
      status: props.body.status,
      reason: props.body.reason,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const updated = await MyGlobal.prisma.community_reports.findUnique({
    where: { id: props.reportId, deleted_at: null },
    select: {
      id: true,
      reason: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      post: {
        select: {
          id: true,
          title: true,
          type: true,
          created_at: true,
          author: {
            select: {
              id: true,
              display_name: true,
              avatar_url: true,
              created_at: true,
              deleted_at: true,
            },
          },
        },
      },
      reporter: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
          created_at: true,
          deleted_at: true,
        },
      },
    },
  });
  return await CommunityReportTransformer.transform(updated);
}
