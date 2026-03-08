import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberEmailVerification";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppMemberEmailVerificationAtSummaryTransformer } from "../transformers/TodoAppMemberEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberEmailVerifications(props: {
  member: MemberPayload;
  body: ITodoAppMemberEmailVerification.IRequest;
}): Promise<IPageITodoAppMemberEmailVerification.ISummary> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Build where input
  const whereInput: Prisma.todo_app_member_email_verificationsWhereInput = {
    deleted_at: null,
  };
  // Apply status filter
  if (props.body.status === "pending") {
    whereInput.used = false;
  } else if (props.body.status === "completed") {
    whereInput.used = true;
  } else if (props.body.status === "expired") {
    whereInput.expires_at = { lt: now };
  }
  // Apply date filters
  if (props.body.createdAfter !== undefined) {
    whereInput.created_at = { gte: props.body.createdAfter };
  }
  if (props.body.createdBefore !== undefined) {
    if (whereInput.created_at !== undefined) {
      if (
        typeof whereInput.created_at === "object" &&
        "gte" in whereInput.created_at
      ) {
        whereInput.created_at = {
          gte: whereInput.created_at.gte,
          lte: props.body.createdBefore,
        };
      } else {
        whereInput.created_at = { lte: props.body.createdBefore };
      }
    } else {
      whereInput.created_at = { lte: props.body.createdBefore };
    }
  }
  // Apply member filter
  if (props.body.memberId !== undefined) {
    whereInput.todo_app_member_id = props.body.memberId;
  }
  // Apply member email filter with includes
  if (props.body.memberEmail !== undefined) {
    whereInput.member = { email: { contains: props.body.memberEmail } };
  }
  // Build order by
  const orderByInput: Prisma.todo_app_member_email_verificationsOrderByWithRelationInput =
    props.body.sortBy === "expiresAt"
      ? { expires_at: props.body.sortOrder ?? "desc" }
      : props.body.sortBy === "status"
        ? { used: props.body.sortOrder === "asc" ? "asc" : "desc" }
        : { created_at: props.body.sortOrder ?? "desc" };
  // Handle cursor pagination
  const direction: "forward" | "backward" = props.body.direction ?? "forward";
  let cursorInput:
    | Prisma.todo_app_member_email_verificationsWhereInput
    | undefined;
  if (props.body.cursor !== undefined) {
    if (direction === "backward") {
      cursorInput = {
        created_at: { lt: props.body.cursor },
      };
    } else {
      cursorInput = {
        created_at: { gt: props.body.cursor },
      };
    }
  }
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const pageSize = props.body.pageSize ?? 50;
  const skip = (page - 1) * limit;
  // Build final where
  const finalWhere: Prisma.todo_app_member_email_verificationsWhereInput = {
    ...whereInput,
    ...cursorInput,
  };
  // Query data
  const data =
    await MyGlobal.prisma.todo_app_member_email_verifications.findMany({
      where: finalWhere,
      orderBy: [orderByInput],
      take: pageSize,
      skip: skip,
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        token: true,
        expires_at: true,
        used: true,
        used_at: true,
        member: {
          select: {
            id: true,
            email: true,
            password_hash: true,
            display_name: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            memberSessions: true,
            passwordResets: true,
            emailVerifications: true,
            todos: true,
            editHistories: true,
            profile: true,
          },
        },
      },
    });
  // Count total
  const total = await MyGlobal.prisma.todo_app_member_email_verifications.count(
    {
      where: finalWhere,
    },
  );
  // Transform and return
  const transformedData = await ArrayUtil.asyncMap(
    data,
    TodoAppMemberEmailVerificationAtSummaryTransformer.transform,
  );
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
