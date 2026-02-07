import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardUserAtSummaryTransformer } from "../transformers/DiscussionBoardUserAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUsers(props: {
  body: IDiscussionBoardUser.IRequest;
}): Promise<IPageIDiscussionBoardUser.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.discussion_board_usersWhereInput = {
    deleted_at: null,
  };
  // Apply search filter
  if (props.body.search) {
    whereInput.display_name = { contains: props.body.search };
  }
  // Apply email filter - handle null case by converting to undefined
  if (props.body.email !== undefined && props.body.email !== null) {
    whereInput.email = props.body.email;
  }
  // Apply sorting
  const orderByInput = (
    props.body.sort === "oldest"
      ? { created_at: "asc" as const }
      : props.body.sort === "display_name_asc"
        ? { display_name: "asc" as const }
        : props.body.sort === "display_name_desc"
          ? { display_name: "desc" as const }
          : { created_at: "desc" as const }
  ) satisfies Prisma.discussion_board_usersOrderByWithRelationInput;
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_users.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardUserAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_users.count({
      where: whereInput,
    }),
  ]);
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardUserAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
