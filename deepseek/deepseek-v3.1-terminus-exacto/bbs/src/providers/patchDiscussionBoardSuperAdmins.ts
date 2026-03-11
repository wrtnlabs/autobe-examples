import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSuperAdminAtSummaryTransformer } from "../transformers/DiscussionBoardSuperAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdmins(props: {
  body: IDiscussionBoardSuperAdmin.IRequest;
}): Promise<IPageIDiscussionBoardSuperAdmin.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_super_adminsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      email: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.admin_grade && {
      admin_grade: props.body.admin_grade,
    }),
    ...(props.body.created_at_start && {
      created_at: { gte: new Date(props.body.created_at_start) },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: new Date(props.body.created_at_end) },
    }),
    ...(props.body.updated_at_start && {
      updated_at: { gte: new Date(props.body.updated_at_start) },
    }),
    ...(props.body.updated_at_end && {
      updated_at: { lte: new Date(props.body.updated_at_end) },
    }),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_super_admins.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardSuperAdminAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_super_admins.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSuperAdminAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
