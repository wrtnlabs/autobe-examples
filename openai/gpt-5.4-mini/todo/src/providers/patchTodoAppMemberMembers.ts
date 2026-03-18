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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberMembers(props: {
  member: MemberPayload;
  body: ITodoAppMember.IRequest;
}): Promise<IPageITodoAppMember.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const search: string | undefined = props.body.search;
  const order: "asc" | "desc" = props.body.order ?? "desc";
  const sortField: "created_at" | "updated_at" =
    props.body.sort ?? "created_at";
  const where: Prisma.todo_app_membersWhereInput = {
    deleted_at: null,
    ...(search === undefined || search.length === 0
      ? {}
      : {
          email: {
            contains: search,
            mode: "insensitive",
          },
        }),
  };
  const orderBy: Prisma.todo_app_membersOrderByWithRelationInput[] = [
    {
      [sortField]: order,
    } satisfies Prisma.todo_app_membersOrderByWithRelationInput,
    {
      id: order,
    },
  ];
  const records = await MyGlobal.prisma.todo_app_members.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.todo_app_members.count({ where });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map(
      (record): ITodoAppMember.ISummary => ({
        id: record.id,
        email: record.email,
        created_at: record.created_at.toISOString(),
        updated_at: record.updated_at.toISOString(),
        deleted_at:
          record.deleted_at === null ? null : record.deleted_at.toISOString(),
      }),
    ),
  };
}
