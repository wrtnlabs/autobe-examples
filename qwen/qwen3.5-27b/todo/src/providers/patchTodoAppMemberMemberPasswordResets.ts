import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberPasswordReset";
import { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppMemberPasswordResetAtSummaryTransformer } from "../transformers/TodoAppMemberPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberMemberPasswordResets(props: {
  member: MemberPayload;
  body: ITodoAppMemberPasswordReset.IRequest;
}): Promise<IPageITodoAppMemberPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const sort = props.body.sort ?? "created_at";
  const order = props.body.order ?? "desc";
  const skip = (page - 1) * limit;
  const whereInput = {
    todo_app_member_id: props.member.id,
    deleted_at: null,
    ...(props.body.expired_before && {
      expired_at: { lt: new Date(props.body.expired_before) },
    }),
    ...(props.body.expired_after && {
      expired_at: { gt: new Date(props.body.expired_after) },
    }),
  } satisfies Prisma.todo_app_member_password_resetsWhereInput;
  const orderByInput = {
    [sort]: order,
  } satisfies Prisma.todo_app_member_password_resetsOrderByWithRelationInput;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.todo_app_member_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...TodoAppMemberPasswordResetAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.todo_app_member_password_resets.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      TodoAppMemberPasswordResetAtSummaryTransformer.transform,
    ),
  };
}
