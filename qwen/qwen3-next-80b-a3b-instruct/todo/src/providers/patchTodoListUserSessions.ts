import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";
import { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserSessions(props: {
  user: UserPayload;
  body: ITodoListUserSession.IRequest;
}): Promise<IPageITodoListUserSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const whereInput: Prisma.todo_list_user_sessionsWhereInput = {
    // Always ensure sessions are not deleted (if deleted_at exists)
    // Schema does not include deleted_at - no need to filter
    // Filter by user_id if specified
    todo_list_user_id: props.body.user_id,
    // Filter by created_at
    created_at: undefined,
    // Filter by expired_at (correct field name)
    expired_at: undefined,
  };
  // Apply created_at filters
  if (props.body.created_after || props.body.created_before) {
    whereInput.created_at = {};
    if (props.body.created_after) {
      whereInput.created_at.gte = props.body.created_after;
    }
    if (props.body.created_before) {
      whereInput.created_at.lte = props.body.created_before;
    }
  }
  // Apply expired_at filters (correct field name)
  if (props.body.expires_after || props.body.expires_before) {
    whereInput.expired_at = {};
    if (props.body.expires_after) {
      whereInput.expired_at.gte = props.body.expires_after;
    }
    if (props.body.expires_before) {
      whereInput.expired_at.lte = props.body.expires_before;
    }
  }
  // Apply full-text search on metadata fields
  if (props.body.search) {
    whereInput.OR = [
      {
        todo_list_user_id: { equals: props.body.search },
      },
      { ip: { equals: props.body.search } },
    ];
  }
  // Build orderBy object with const assertion (only valid fields)
  const orderByInput = (
    props.body.sort_by === "created_at"
      ? { created_at: props.body.order === "desc" ? "desc" : "asc" }
      : props.body.sort_by === "expires_at"
        ? { expired_at: props.body.order === "desc" ? "desc" : "asc" }
        : props.body.sort_by === "last_activity"
          ? { created_at: props.body.order === "desc" ? "desc" : "asc" }
          : { created_at: "desc" as const }
  ) satisfies Prisma.todo_list_user_sessionsOrderByWithRelationInput;
  // Get matching sessions
  const data = await MyGlobal.prisma.todo_list_user_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      todo_list_user_id: true,
      created_at: true,
      expired_at: true,
      ip: true,
    },
  });
  // Count total records for pagination
  const total = await MyGlobal.prisma.todo_list_user_sessions.count({
    where: whereInput,
  });
  // Transform data to ISummary format
  const summaryData = data.map((session) => ({
    id: session.id,
    user_id: session.todo_list_user_id,
    created_at: toISOStringSafe(session.created_at), // Convert Date to string
    expires_at: toISOStringSafe(session.expired_at), // Convert Date to string
    ip_address: session.ip, // Map prisma 'ip' to 'ip_address'
    last_activity: toISOStringSafe(session.created_at), // Use created_at as fallback for last_activity
    user_agent: "unknown", // No user_agent field in schema, use constant as fallback
    status: "active" as const,
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: summaryData,
  };
}
