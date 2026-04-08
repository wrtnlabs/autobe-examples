import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberEmailVerification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoMemberEmailVerificationAtSummaryTransformer } from "../transformers/MultiUserTodoMemberEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberEmailVerifications(props: {
  body: IMultiUserTodoMemberEmailVerification.IRequest;
}): Promise<IPageIMultiUserTodoMemberEmailVerification.ISummary> {
  const page = props.body.page ?? props.body.pagination?.page ?? 1;
  const limit = props.body.limit ?? props.body.pagination?.limit ?? 100;
  const safePage = page < 1 ? 1 : page;
  const safeLimit = limit < 1 ? 100 : limit > 100 ? 100 : limit;
  const skip = (safePage - 1) * safeLimit;
  const whereClause: Prisma.multi_user_todo_member_email_verificationsWhereInput =
    {};
  if (props.body.email !== undefined) {
    whereClause.email = props.body.email;
  }
  if (props.body.status === "active") {
    whereClause.expires_at = { gt: new Date() };
  } else if (props.body.status === "expired") {
    whereClause.expires_at = { lte: new Date() };
  }
  if (props.body.member_id !== undefined) {
    whereClause.member_id = props.body.member_id;
  }
  if (props.body.date_range !== undefined) {
    const { start_date, end_date } = props.body.date_range;
    const dateConditions: Record<string, unknown> = {};
    if (start_date !== undefined) {
      dateConditions.gte = new Date(toISOStringSafe(start_date));
    }
    if (end_date !== undefined) {
      dateConditions.lte = new Date(toISOStringSafe(end_date));
    }
    if (Object.keys(dateConditions).length > 0) {
      whereClause.created_at = dateConditions;
    }
  }
  const orderByClause: Prisma.multi_user_todo_member_email_verificationsOrderByWithRelationInput[] =
    [
      {
        created_at: props.body.sort_order === "asc" ? "asc" : "desc",
      },
    ];
  if (props.body.sort_by === "expires_at") {
    orderByClause[0].expires_at =
      props.body.sort_order === "asc" ? "asc" : "desc";
  }
  const [records, total] = await Promise.all([
    MyGlobal.prisma.multi_user_todo_member_email_verifications.findMany({
      where: whereClause,
      orderBy: orderByClause,
      skip,
      take: safeLimit,
      ...MultiUserTodoMemberEmailVerificationAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.multi_user_todo_member_email_verifications.count({
      where: whereClause,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      records,
      MultiUserTodoMemberEmailVerificationAtSummaryTransformer.transform,
    ),
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    } satisfies IPage.IPagination,
  } satisfies IPageIMultiUserTodoMemberEmailVerification.ISummary;
}
