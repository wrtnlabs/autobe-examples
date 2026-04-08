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
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 20));
  const skip = (page - 1) * limit;
  const dateFieldFilter = (
    dateStr?: (string & tags.Format<"date">) | null,
  ):
    | {
        gte: string;
      }
    | undefined => {
    if (!dateStr) return undefined;
    return { gte: dateStr };
  };
  const whereInput: Prisma.multi_user_todo_membersWhereInput = {
    ...(props.body.status === "active" ? { deleted_at: null } : undefined),
    ...(props.body.status === "deleted"
      ? { deleted_at: { not: null } }
      : undefined),
    ...(props.body.created_at
      ? { created_at: dateFieldFilter(props.body.created_at) }
      : undefined),
    ...(props.body.updated_at
      ? { updated_at: dateFieldFilter(props.body.updated_at) }
      : undefined),
  } satisfies Prisma.multi_user_todo_membersWhereInput;
  const getOrder = (): Prisma.SortOrder => {
    if (props.body.order === "asc" || props.body.order === "desc") {
      return props.body.order as Prisma.SortOrder;
    }
    return "desc" as Prisma.SortOrder;
  };
  const orderByInput =
    props.body.sortBy === "created_at"
      ? { created_at: getOrder() }
      : props.body.sortBy === "updated_at"
        ? { updated_at: getOrder() }
        : { created_at: "desc" as Prisma.SortOrder };
  const records = await MyGlobal.prisma.multi_user_todo_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...MultiUserTodoMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.multi_user_todo_members.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MultiUserTodoMemberAtSummaryTransformer.transform,
    ),
  };
}
