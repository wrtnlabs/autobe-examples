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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with filters
  const whereClause = {
    todo_app_member_id: props.member.id, // Member-scoped - members can only see their own tokens
    deleted_at: null, // Soft-delete filter
    ...(props.body.purpose !== undefined && {
      purpose: Array.isArray(props.body.purpose)
        ? { in: props.body.purpose }
        : props.body.purpose,
    }),
    ...(props.body.verified !== undefined && {
      verified_at: props.body.verified ? { not: null } : null,
    }),
    ...(props.body.consumed !== undefined && {
      consumed_at: props.body.consumed ? { not: null } : null,
    }),
    ...(props.body.expires_before !== undefined && {
      expires_at: { lte: new Date(props.body.expires_before) },
    }),
    ...(props.body.expires_after !== undefined && {
      expires_at: { gte: new Date(props.body.expires_after) },
    }),
    ...(props.body.created_before !== undefined && {
      created_at: { lte: new Date(props.body.created_before) },
    }),
    ...(props.body.created_after !== undefined && {
      created_at: { gte: new Date(props.body.created_after) },
    }),
    // Ignore todo_app_member_id from request since member can only see their own tokens
    // If provided and doesn't match member.id, it will result in empty result due to todo_app_member_id: props.member.id above
  } satisfies Prisma.todo_app_member_email_verificationsWhereInput;
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_member_email_verifications.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc" as const,
      } satisfies Prisma.todo_app_member_email_verificationsOrderByWithRelationInput,
      ...TodoAppMemberEmailVerificationAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.todo_app_member_email_verifications.count({
      where: whereClause,
    }),
  ]);
  // Transform data
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
