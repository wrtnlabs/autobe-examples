import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalDiscussionBoardUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalDiscussionBoardUserAtSummaryTransformer } from "../transformers/EconomicPoliticalDiscussionBoardUserAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalDiscussionBoardAdminUsers(props: {
  admin: AdminPayload;
  body: IEconomicPoliticalDiscussionBoardUser.IRequest;
}): Promise<IPageIEconomicPoliticalDiscussionBoardUser.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const where: Prisma.economic_political_discussion_board_usersWhereInput = {
    deleted_at: null,
    ...(props.body.search && { email: { contains: props.body.search } }),
    ...(props.body.role && { role: props.body.role }),
    ...(props.body.banned !== undefined && { banned: props.body.banned }),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.economic_political_discussion_board_users.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.economic_political_discussion_board_users.count({ where }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEconomicPoliticalDiscussionBoardUser.ISummary;
}
