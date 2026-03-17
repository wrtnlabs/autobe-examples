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

export async function patchMultiUserTodoMemberPasswordResets(props: {
  member: MemberPayload;
  body: IMultiUserTodoMemberPasswordReset.IRequest;
}): Promise<IPageIMultiUserTodoMemberPasswordReset.ISummary> {
  const page = Math.max(props.body.page ?? 1, 1);
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const now = new Date();
  const whereInput: Prisma.multi_user_todo_member_password_resetsWhereInput = {
    ...(props.body.multi_user_todo_member_id && {
      multi_user_todo_member_id: props.body.multi_user_todo_member_id,
    }),
    ...(props.body.status === "expired" && {
      expires_at: { lt: now },
    }),
    ...(props.body.status === "valid" && {
      expires_at: { gte: now },
      deleted_at: null,
    }),
    ...(props.body.status === "upcoming" && {
      expires_at: {
        gte: now,
        lte: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
      deleted_at: null,
    }),
    ...(props.body.created_at_start && {
      created_at: { gte: new Date(props.body.created_at_start) },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: new Date(props.body.created_at_end) },
    }),
    ...(props.body.expires_at_start && {
      expires_at: { gte: new Date(props.body.expires_at_start) },
    }),
    ...(props.body.expires_at_end && {
      expires_at: { lte: new Date(props.body.expires_at_end) },
    }),
    ...(props.body.include_deleted !== true ? { deleted_at: null } : {}),
  };
  const orderByInput = (
    props.body.sort_by === "expires_at"
      ? { expires_at: (props.body.sort_order ?? "desc") as Prisma.SortOrder }
      : props.body.sort_by === "id"
        ? { id: (props.body.sort_order ?? "desc") as Prisma.SortOrder }
        : { created_at: (props.body.sort_order ?? "desc") as Prisma.SortOrder }
  ) satisfies Prisma.multi_user_todo_member_password_resetsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.multi_user_todo_member_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...MultiUserTodoMemberPasswordResetAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.multi_user_todo_member_password_resets.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      MultiUserTodoMemberPasswordResetAtSummaryTransformer.transform,
    ),
  };
}
