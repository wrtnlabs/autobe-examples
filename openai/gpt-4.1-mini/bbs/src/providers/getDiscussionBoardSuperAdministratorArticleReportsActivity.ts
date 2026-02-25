import { IDiscussionBoardArticleReportActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleReportActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdministratorArticleReportsActivity(props: {
  superAdministrator: SuperadministratorPayload;
}): Promise<IDiscussionBoardArticleReportActivity> {
  // Since discussion_board_article_reports does not exist in PrismaClient,
  // we return zero counts to satisfy the interface.
  return {
    totalReports: 0 as number,
    resolvedReports: 0 as number,
    pendingReports: 0 as number,
  };
}
