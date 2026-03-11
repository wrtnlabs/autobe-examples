import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoMemberPasswordResetAtSummaryTransformer } from "../transformers/MultiUserTodoMemberPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberMembersPasswordResets(props: {
  member: MemberPayload;
  body: IMultiUserTodoMemberPasswordReset.IRequest;
}): Promise<IPageIMultiUserTodoMemberPasswordReset.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput = {
    member: {
      id: props.member.id, // Privacy isolation: only member's own password resets
      ...(props.body.email && { email: { contains: props.body.email } }),
      ...(props.body.display_name && {
        display_name: { contains: props.body.display_name },
      }),
    },
    ...(props.body.expired !== undefined && {
      expires_at: props.body.expired ? { lt: new Date() } : { gte: new Date() },
    }),
    ...(props.body.used !== undefined && {
      used_at: props.body.used ? { not: null } : null,
    }),
  } satisfies Prisma.multi_user_todo_member_password_resetsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.multi_user_todo_member_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...MultiUserTodoMemberPasswordResetAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.multi_user_todo_member_password_resets.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      MultiUserTodoMemberPasswordResetAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
