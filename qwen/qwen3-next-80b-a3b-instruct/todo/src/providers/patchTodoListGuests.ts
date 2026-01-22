import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import { IPageITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchTodoListGuests(props: {
  body: ITodoListGuest.IRequest;
}): Promise<IPageITodoListGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where condition based on IRequest properties - map camelCase to snake_case for Prisma
  const whereInput = {
    // Filter by created_at range
    ...(props.body.createdAtStart && {
      created_at: { gte: props.body.createdAtStart },
    }),
    ...(props.body.createdAtEnd && {
      created_at: { lte: props.body.createdAtEnd },
    }),
    // Filter by last_activity_at range
    ...(props.body.lastActivityAtStart && {
      last_activity_at: { gte: props.body.lastActivityAtStart },
    }),
    ...(props.body.lastActivityAtEnd && {
      last_activity_at: { lte: props.body.lastActivityAtEnd },
    }),
    // Filter by duration range
    ...(props.body.durationMin || props.body.durationMax
      ? {
          duration: {
            gte: props.body.durationMin,
            lte: props.body.durationMax,
          },
        }
      : {}),
    // Filter by ip_address
    ...(props.body.ipAddress && { ip_address: props.body.ipAddress }),
    // Full-text search across ip_address
    ...(props.body.search && { ip_address: { contains: props.body.search } }),
  } satisfies Prisma.todo_list_guest_sessionsWhereInput;
  // Build orderBy condition - use const for type safety with camelCase field names for Prisma TypeScript types
  const orderByInput = (
    props.body.orderBy === "createdAt"
      ? {
          created_at:
            props.body.orderDirection === "desc"
              ? ("desc" as const)
              : ("asc" as const),
        }
      : { created_at: "desc" as const }
  ) satisfies Prisma.todo_list_guest_sessionsOrderByWithRelationInput; // All other fields are invalid for orderBy, so fall back to created_at // Default
  // Query for data
  const data = await MyGlobal.prisma.todo_list_guest_sessions.findMany({
    skip,
    take: limit,
    orderBy: orderByInput,
    where: whereInput,
  });
  // Count total records
  const total = await MyGlobal.prisma.todo_list_guest_sessions.count({
    where: whereInput,
  });
  // Transform to IPageITodoListGuest.ISummary format
  const transformedData = data.map((session) => ({
    id: session.id,
    createdAt: toISOStringSafe(session.created_at),
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
