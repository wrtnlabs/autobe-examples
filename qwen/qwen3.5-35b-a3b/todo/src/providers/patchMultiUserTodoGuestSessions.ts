import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { MultiUserTodoMemberSessionAtSummaryTransformer } from "../transformers/MultiUserTodoMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoGuestSessions(props: {
  guest: GuestPayload;
  body: IMultiUserTodoMemberSession.IRequest;
}): Promise<IPageIMultiUserTodoMemberSession.ISummary> {
  // Extract pagination params with defaults
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  // Build base where clause
  const whereInput: Prisma.multi_user_todo_member_sessionsWhereInput = {
    multi_user_todo_member_id: props.guest.id,
  };
  // Apply date range filters
  if (
    props.body.created_at_gte !== undefined ||
    props.body.created_at_lte !== undefined
  ) {
    const created_atFilter: Prisma.DateTimeFilter = {};
    if (props.body.created_at_gte !== undefined) {
      created_atFilter.gte = props.body.created_at_gte;
    }
    if (props.body.created_at_lte !== undefined) {
      created_atFilter.lte = props.body.created_at_lte;
    }
    whereInput.created_at = created_atFilter;
  }
  // Apply IP filter
  if (props.body.ip !== undefined) {
    whereInput.ip = {
      contains: props.body.ip,
    };
  }
  // Handle status filter
  if (props.body.status !== undefined && props.body.status !== "all") {
    if (props.body.status === "active") {
      whereInput.expired_at = {
        gt: new Date(),
      };
    } else if (props.body.status === "expired") {
      whereInput.expired_at = {
        lte: new Date(),
      };
    }
  }
  // Build orderBy
  const sortField: "created_at" | "expired_at" | "ip" =
    props.body.sort_by ?? "created_at";
  const sortOrder: "asc" | "desc" = props.body.sort_order ?? "desc";
  const orderByInput: Prisma.multi_user_todo_member_sessionsOrderByWithRelationInput =
    sortField === "created_at"
      ? { created_at: sortOrder }
      : sortField === "expired_at"
        ? { expired_at: sortOrder }
        : { ip: sortOrder };
  // Calculate skip for pagination
  const skip: number = (page - 1) * limit;
  // Query records
  const records =
    await MyGlobal.prisma.multi_user_todo_member_sessions.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...MultiUserTodoMemberSessionAtSummaryTransformer.select(),
    });
  // Count total records
  const total: number =
    await MyGlobal.prisma.multi_user_todo_member_sessions.count({
      where: whereInput,
    });
  // Build pagination metadata
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: total === 0 ? 0 : Math.ceil(total / limit),
  };
  // Transform records
  const data: IMultiUserTodoMemberSession.ISummary[] = await ArrayUtil.asyncMap(
    records,
    (record) =>
      MultiUserTodoMemberSessionAtSummaryTransformer.transform(record),
  );
  // Return paginated response
  return {
    pagination,
    data,
  } satisfies IPageIMultiUserTodoMemberSession.ISummary;
}
