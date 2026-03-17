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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoMemberEmailVerificationAtSummaryTransformer } from "../transformers/MultiUserTodoMemberEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IMultiUserTodoMemberEmailVerification.IRequest;
}): Promise<IPageIMultiUserTodoMemberEmailVerification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    multi_user_todo_member_id: props.member.id,
    deleted_at: null,
    ...(props.body.purpose !== undefined && {
      purpose: props.body.purpose,
    }),
    ...(props.body.email !== undefined && {
      email: { contains: props.body.email },
    }),
    ...(props.body.used !== undefined && {
      used_at: props.body.used ? { not: null } : null,
    }),
    ...(props.body.expired !== undefined && {
      expires_at: props.body.expired ? { lt: new Date() } : { gte: new Date() },
    }),
  } satisfies Prisma.multi_user_todo_member_email_verificationsWhereInput;
  const orderByInput = (
    props.body.sort_by === "created_at"
      ? { created_at: props.body.sort_order ?? "desc" }
      : props.body.sort_by === "expires_at"
        ? { expires_at: props.body.sort_order ?? "desc" }
        : props.body.sort_by === "used_at"
          ? { used_at: props.body.sort_order ?? "desc" }
          : { created_at: "desc" }
  ) satisfies Prisma.multi_user_todo_member_email_verificationsOrderByWithRelationInput;
  const records =
    await MyGlobal.prisma.multi_user_todo_member_email_verifications.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...MultiUserTodoMemberEmailVerificationAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.multi_user_todo_member_email_verifications.count({
      where: whereInput,
    });
  const data = await ArrayUtil.asyncMap(
    records,
    MultiUserTodoMemberEmailVerificationAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIMultiUserTodoMemberEmailVerification.ISummary;
}
