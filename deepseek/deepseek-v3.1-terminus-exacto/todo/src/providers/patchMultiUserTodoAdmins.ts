import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoAdminAtSummaryTransformer } from "../transformers/MultiUserTodoAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoAdmins(props: {
  body: IMultiUserTodoAdmin.IRequest;
}): Promise<IPageIMultiUserTodoAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.multi_user_todo_adminsWhereInput = {
    ...(props.body.include_deleted !== true && { deleted_at: null }),
    ...(props.body.search && {
      OR: [
        { email: { contains: props.body.search, mode: "insensitive" } },
        { display_name: { contains: props.body.search, mode: "insensitive" } },
      ],
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
  const data = await MyGlobal.prisma.multi_user_todo_admins.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...MultiUserTodoAdminAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.multi_user_todo_admins.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      MultiUserTodoAdminAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
