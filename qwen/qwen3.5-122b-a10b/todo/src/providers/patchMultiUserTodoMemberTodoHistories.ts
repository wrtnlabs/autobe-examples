import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoHistory";
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

export async function patchMultiUserTodoMemberTodoHistories(props: {
  member: MemberPayload;
  body: IMultiUserTodoTodoHistory.IRequest;
}): Promise<IPageIMultiUserTodoTodoHistory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const whereInput: Prisma.multi_user_todo_todo_historiesWhereInput = {
    deleted_at: null,
    multi_user_todo_member_id: props.member.id,
    // Apply filters from request body
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.changed_at_from && {
      changed_at: {
        gte: new Date(props.body.changed_at_from),
      },
    }),
    ...(props.body.changed_at_to && {
      changed_at: {
        lte: new Date(props.body.changed_at_to),
      },
    }),
    ...(props.body.title && {
      title: props.body.title,
    }),
    ...(props.body.description && {
      description: props.body.description,
    }),
  } satisfies Prisma.multi_user_todo_todo_historiesWhereInput;
  // Fetch paginated history entries
  const histories =
    await MyGlobal.prisma.multi_user_todo_todo_histories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { changed_at: "desc" },
      select: {
        id: true,
        changed_at: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        member: {
          select: {
            id: true,
            email: true,
            name: true,
            nickname: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        created_at: true,
      },
    });
  // Count total records
  const total = await MyGlobal.prisma.multi_user_todo_todo_histories.count({
    where: whereInput,
  });
  // Transform to DTO format
  const data = await ArrayUtil.asyncMap(histories, async (history) => {
    return {
      id: history.id as string & tags.Format<"uuid">,
      changed_at: toISOStringSafe(history.changed_at),
      title: history.title,
      description: history.description,
      start_date: history.start_date
        ? toISOStringSafe(history.start_date)
        : null,
      due_date: history.due_date ? toISOStringSafe(history.due_date) : null,
      member: {
        id: history.member.id as string & tags.Format<"uuid">,
        email: history.member.email as string & tags.Format<"email">,
        name: history.member.name,
        nickname: history.member.nickname,
        created_at: toISOStringSafe(history.member.created_at),
        updated_at: toISOStringSafe(history.member.updated_at),
        deleted_at: history.member.deleted_at
          ? toISOStringSafe(history.member.deleted_at)
          : null,
      } satisfies IMultiUserTodoMember.ISummary,
      created_at: toISOStringSafe(history.created_at),
    } satisfies IMultiUserTodoTodoHistory.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIMultiUserTodoTodoHistory.ISummary;
}
