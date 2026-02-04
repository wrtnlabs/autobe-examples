import { IEconomicDiscussionSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicDiscussionSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicDiscussionSections(props: {
  body?: {
    page?: number;
    limit?: number;
  };
}): Promise<IPageIEconomicDiscussionSection.ISummary> {
  const page = props.body?.page ?? 1;
  const limit = props.body?.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query database with select for required fields
  const data = await MyGlobal.prisma.economic_discussion_sections.findMany({
    where: {},
    orderBy: { name: "asc" },
    skip,
    take: limit,
    select: {
      name: true,
      description: true,
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.economic_discussion_sections.count();
  // Construct pagination object
  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  // Return complete response structure
  return {
    pagination,
    data,
  };
}
