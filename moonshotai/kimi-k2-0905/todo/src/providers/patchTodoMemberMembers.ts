import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";
import { IPageITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchTodoMemberMembers(props: {
  member: MemberPayload;
  body: ITodoMember.IRequest;
}): Promise<IPageITodoMember.ISummary> {
  // Process pagination parameters with defaults and brand stripping
  const page = Number(props.body.page ?? 1);
  const limit = Number(props.body.limit ?? 100);
  // Calculate skip for pagination
  const skip = (page - 1) * limit;
  // Build where conditions based on search
  const where: Prisma.todo_memberWhereInput = {};

  if (props.body.search) {
    where.OR = [
      { email: { contains: props.body.search } },
      { id: props.body.search }, // UUID fields use direct equality
    ];
  }

  // Query total count and paginated results efficiently
  const [total, members] = await Promise.all([
    MyGlobal.prisma.todo_member.count({ where }),
    MyGlobal.prisma.todo_member.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        created_at: true,
        last_login_at: true,
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
  ]);

  // Calculate total pages
  const totalPages = Math.ceil(total / limit);

  // Map results to ISummary format with proper type conversions
  const summaries: ITodoMember.ISummary[] = members.map((member) => ({
    id: member.id as string & tags.Format<"uuid">,
    email: member.email as string & tags.Format<"email">,
    role: member.role as IETodoRole,
    created_at: toISOStringSafe(member.created_at),
    last_login_at: member.last_login_at
      ? toISOStringSafe(member.last_login_at)
      : null,
  }));

  // Build response with pagination metadata and data
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    },
    data: summaries,
  };
}
