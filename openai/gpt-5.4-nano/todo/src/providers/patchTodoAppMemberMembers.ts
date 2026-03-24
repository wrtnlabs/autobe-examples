import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMember";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const search = props.body.search;
  const completion_status = props.body.completion_status;
  const start_date = props.body.start_date;
  const due_date = props.body.due_date;
  const deleted_in_trash = props.body.deleted_in_trash;
  if (page < 1) {
    throw new HttpException("Invalid page", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Invalid limit", 400);
  }
  // This endpoint returns member summaries; scope is always the authenticated member.
  // Request-body filters are accepted by the DTO contract but do not change the member summary.
  void search;
  void completion_status;
  void start_date;
  void due_date;
  void deleted_in_trash;
  const total = 1;
  const pages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;
  const dataQuery = skip === 0 ? true : false;
  const memberRow = dataQuery
    ? await MyGlobal.prisma.todo_app_members.findUnique({
        where: { id: props.member.id },
        select: {
          id: true,
          email: true,
          status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          userProfile: {
            select: {
              id: true,
              display_name: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            } satisfies Prisma.todo_app_user_profilesSelect,
          },
        },
      })
    : null;
  // If the record is missing, treat as inaccessible to avoid leaking info.
  if (memberRow === null) {
    return {
      data: [],
      pagination: {
        current: page,
        limit,
        records: total,
        pages,
      },
    } satisfies IPageITodoAppMember.ISummary;
  }
  const profile =
    memberRow.userProfile === null
      ? null
      : ({
          id: memberRow.userProfile.id,
          display_name: memberRow.userProfile.display_name,
          created_at: memberRow.userProfile.created_at.toISOString(),
          updated_at: memberRow.userProfile.updated_at.toISOString(),
          deleted_at: memberRow.userProfile.deleted_at?.toISOString() ?? null,
        } satisfies ITodoAppUserProfile);
  const summary = {
    id: memberRow.id,
    email: memberRow.email,
    status: memberRow.status,
    profile,
    created_at: memberRow.created_at.toISOString(),
    updated_at: memberRow.updated_at.toISOString(),
    deleted_at: memberRow.deleted_at?.toISOString() ?? null,
  } satisfies ITodoAppMember.ISummary;
  return {
    data: [summary],
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
  } satisfies IPageITodoAppMember.ISummary;
}
