import { IAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministrator";
import { IEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorAuditLog";
import { IEconomicBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleView";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticleView";
import { IUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EconomicBoardArticleViewTransformer } from "../transformers/EconomicBoardArticleViewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchEconomicBoardAdministratorReportsActivity(props: {
  administrator: AdministratorPayload;
  body: IEconomicBoardAdministratorAuditLog;
}): Promise<IPageIEconomicBoardArticleView> {
  // Extract pagination from query parameters (not body)
  const page = 1; // Default page
  const limit = 30; // Default limit
  const skip = (page - 1) * limit;
  // Define date range: past 30 days from now
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Query database with transformer's select and filters
  const data = await MyGlobal.prisma.economic_board_article_views.findMany({
    where: {
      created_at: {
        gte: thirtyDaysAgo,
        lt: now,
      },
    },
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    ...EconomicBoardArticleViewTransformer.select(),
  });
  // Count total matching records
  const total = await MyGlobal.prisma.economic_board_article_views.count({
    where: {
      created_at: {
        gte: thirtyDaysAgo,
        lt: now,
      },
    },
  });
  // Transform each record using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EconomicBoardArticleViewTransformer.transform,
  );
  // Return paginated result with correct structure
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
