import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAdministratorAtSummaryTransformer } from "../transformers/DiscussionBoardAdministratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministrators(props: {
  body: IDiscussionBoardAdministrator.IRequest;
}): Promise<IPageIDiscussionBoardAdministrator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_administratorsWhereInput = {
    deleted_at: null,
  };
  if (props.body.grade !== undefined) {
    whereInput.grade = props.body.grade;
  }
  if (props.body.search !== undefined && props.body.search.length > 0) {
    const searchPattern = `%${props.body.search}%`;
    whereInput.OR = [
      { email: { contains: searchPattern } },
      { display_name: { contains: searchPattern } },
    ];
  }
  const orderByInput: Prisma.discussion_board_administratorsOrderByWithRelationInput =
    props.body.sortBy === "email"
      ? { email: props.body.sortOrder ?? "desc" }
      : props.body.sortBy === "display_name"
        ? { display_name: props.body.sortOrder ?? "desc" }
        : props.body.sortBy === "grade"
          ? { grade: props.body.sortOrder ?? "desc" }
          : { created_at: props.body.sortOrder ?? "desc" };
  const data = await MyGlobal.prisma.discussion_board_administrators.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...DiscussionBoardAdministratorAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_administrators.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardAdministratorAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
