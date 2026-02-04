import { IEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EconomicDiscussionBanAtSummaryTransformer } from "../transformers/EconomicDiscussionBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicDiscussionAdministratorBans(props: {
  administrator: AdministratorPayload;
}): Promise<IPageIEconomicDiscussionBan.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Use transformer's select method to fetch exactly the fields needed for transformation
  const data = await MyGlobal.prisma.economic_discussion_bans.findMany({
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    ...EconomicDiscussionBanAtSummaryTransformer.select(),
  });
  // Count total bans for pagination
  const total = await MyGlobal.prisma.economic_discussion_bans.count();
  // Transform each ban record using transformer
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EconomicDiscussionBanAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
