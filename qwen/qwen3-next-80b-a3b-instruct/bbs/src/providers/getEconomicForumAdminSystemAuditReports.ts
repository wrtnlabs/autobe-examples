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
import { IPageIEconomicForumSystemAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicForumSystemAudit";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconomicForumSystemAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumSystemAudit";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicForumSystemAuditAtSummaryTransformer } from "../transformers/EconomicForumSystemAuditAtSummaryTransformer";

export async function getEconomicForumAdminSystemAuditReports(props: {
  admin: AdminPayload;
}): Promise<IPageIEconomicForumSystemAudit.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.economic_forum_system_audits.findMany({
    where: {
      deleted_at: null,
    },
    orderBy: {
      created_at: "desc",
    },
    skip,
    take: limit,
    ...EconomicForumSystemAuditAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.economic_forum_system_audits.count({
    where: {
      deleted_at: null,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EconomicForumSystemAuditAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
