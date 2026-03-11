import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoMemberAtSummaryTransformer } from "../transformers/MultiUserTodoMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMembers(props: {
  body: IMultiUserTodoMember.IRequest;
}): Promise<IPageIMultiUserTodoMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause based on filter criteria
  const whereInput = {
    ...(props.body.search && {
      OR: [
        {
          email: { contains: props.body.search, mode: "insensitive" as const },
        },
        {
          display_name: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
    ...(props.body.email && { email: props.body.email }),
    ...(props.body.display_name && { display_name: props.body.display_name }),
    ...(props.body.active !== undefined && props.body.active === true
      ? { deleted_at: null }
      : props.body.active === false
        ? { deleted_at: { not: null } }
        : {}),
    ...(props.body.created_after && {
      created_at: { gt: new Date(props.body.created_after) },
    }),
    ...(props.body.created_before && {
      created_at: { lt: new Date(props.body.created_before) },
    }),
    ...(props.body.updated_after && {
      updated_at: { gt: new Date(props.body.updated_after) },
    }),
    ...(props.body.updated_before && {
      updated_at: { lt: new Date(props.body.updated_before) },
    }),
  } satisfies Prisma.multi_user_todo_membersWhereInput;
  // Execute queries sequentially (not Promise.all)
  const data = await MyGlobal.prisma.multi_user_todo_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...MultiUserTodoMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.multi_user_todo_members.count({
    where: whereInput,
  });
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    MultiUserTodoMemberAtSummaryTransformer.transform,
  );
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
