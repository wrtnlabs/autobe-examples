import { IEconomicPoliticalDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalDiscussionBoardAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalDiscussionBoardAdminAtSummaryTransformer } from "../transformers/EconomicPoliticalDiscussionBoardAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalDiscussionBoardAdminAdmins(props: {
  admin: AdminPayload;
  body: IEconomicPoliticalDiscussionBoardAdmin.IRequest;
}): Promise<IPageIEconomicPoliticalDiscussionBoardAdmin.ISummary> {
  const {
    page = 1,
    limit = 20,
    email = undefined,
    role = undefined,
    sort = "newest",
  } = props.body;
  // Validating pagination parameters
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  const skip = (page - 1) * limit;
  const orderBy = { created_at: sort === "oldest" ? "asc" : "desc" };
  // Fetching data with transformed select
  const [data, total] = await Promise.all([
    MyGlobal.prisma.economic_political_discussion_board_admins.findMany({
      where: {
        deleted_at: null,
        email: email ? { contains: email } : undefined,
        role: role ? { equals: role } : undefined,
      },
      skip,
      take: limit,
      orderBy,
      ...EconomicPoliticalDiscussionBoardAdminAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.economic_political_discussion_board_admins.count({
      where: {
        deleted_at: null,
        email: email ? { contains: email } : undefined,
        role: role ? { equals: role } : undefined,
      },
    }),
  ]);
  const pages = Math.ceil(total / limit);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EconomicPoliticalDiscussionBoardAdminAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
  };
}
