import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserEmailVerification";
import { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserEmailVerifications(props: {
  user: UserPayload;
  body: ITodoAppUserEmailVerification.IRequest;
}): Promise<IPageITodoAppUserEmailVerification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause using actual existing field 'user_id' (not status) from schema
  const whereInput = {
    // status field does NOT exist in schema - must use available fields only
    user_id: props.user.id,
    // Only created_at is available for filtering
    ...(props.body.created_at_from && {
      created_at: { gte: props.body.created_at_from },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: props.body.created_at_to },
    }),
  } satisfies Prisma.todo_app_user_email_verificationsWhereInput;
  // Build orderBy clause with default sort
  const orderByInput = (
    props.body.sort_by === "created_at" && props.body.sort_order === "asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.todo_app_user_email_verificationsOrderByWithRelationInput;
  // Query data with only available fields: id, created_at, user_id, expired_at, token
  const data = await MyGlobal.prisma.todo_app_user_email_verifications.findMany(
    {
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: {
        id: true,
        created_at: true,
        user_id: true,
        expired_at: true,
        token: true,
      },
    },
  );
  // Count total records with same where clause
  const total = await MyGlobal.prisma.todo_app_user_email_verifications.count({
    where: whereInput,
  });
  // Map to match ITodoAppUserEmailVerification.ISummary
  // Note: The summary DTO has "status" and "createdAt" fields
  // Since 'status' field doesn't exist in schema, we must infer it from expired_at
  // Based on DTO: status is "pending" | "completed" | "expired"
  // Default: status based on expiration - if expired_at exists and is in past = expired, otherwise pending
  const transformedData = data.map((item) => {
    let status: "pending" | "completed" | "expired";
    // Calculate status from the data
    if (item.expired_at && new Date(item.expired_at) < new Date()) {
      status = "expired";
    } else {
      status = "pending";
    }
    // createdAt must be string & Format<"date-time">, NOT optional
    // Must be a string, never undefined - use toISOStringSafe on created_at
    const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
      item.created_at,
    );
    return {
      status,
      createdAt,
    };
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
