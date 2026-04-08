import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMember";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppMemberAtSummaryTransformer } from "../transformers/TodoAppMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMembers(props: {
  body: ITodoAppMember.IRequest;
}): Promise<IPageITodoAppMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.todo_app_membersWhereInput = {
    deleted_at: props.body.include_deleted ? undefined : null,
  };
  if (
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search !== ""
  ) {
    whereInput.OR = [
      { email: { contains: props.body.search, mode: "insensitive" } },
      {
        display_name: { contains: props.body.search, mode: "insensitive" },
      },
    ];
  }
  if (
    props.body.created_at_from !== undefined &&
    props.body.created_at_from !== null
  ) {
    whereInput.created_at = {
      gte: new Date(props.body.created_at_from),
    };
  }
  if (
    props.body.created_at_to !== undefined &&
    props.body.created_at_to !== null
  ) {
    if (whereInput.created_at) {
      whereInput.created_at = {
        ...(whereInput.created_at as Prisma.DateTimeFilter),
        lte: new Date(props.body.created_at_to),
      };
    } else {
      whereInput.created_at = {
        lte: new Date(props.body.created_at_to),
      };
    }
  }
  if (
    props.body.updated_at_from !== undefined &&
    props.body.updated_at_from !== null
  ) {
    whereInput.updated_at = {
      gte: new Date(props.body.updated_at_from),
    };
  }
  if (
    props.body.updated_at_to !== undefined &&
    props.body.updated_at_to !== null
  ) {
    if (whereInput.updated_at) {
      whereInput.updated_at = {
        ...(whereInput.updated_at as Prisma.DateTimeFilter),
        lte: new Date(props.body.updated_at_to),
      };
    } else {
      whereInput.updated_at = {
        lte: new Date(props.body.updated_at_to),
      };
    }
  }
  const sort_by = props.body.sort_by ?? "created_at";
  const sort_order = props.body.sort_order ?? "desc";
  const orderByInput: Prisma.todo_app_membersOrderByWithRelationInput = {
    [sort_by]: sort_order,
  };
  const data = await MyGlobal.prisma.todo_app_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...TodoAppMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_members.count({
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
      data,
      TodoAppMemberAtSummaryTransformer.transform,
    ),
  };
}
