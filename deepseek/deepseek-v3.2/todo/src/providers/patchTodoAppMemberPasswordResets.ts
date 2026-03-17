import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberPasswordReset";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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

export async function patchTodoAppMemberPasswordResets(props: {
  member: MemberPayload;
  body: ITodoAppMemberPasswordReset.IRequest;
}): Promise<IPageITodoAppMemberPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    todo_app_member_id: props.member.id,
    used:
      props.body.used !== undefined && props.body.used !== null
        ? props.body.used
        : undefined,
    token: props.body.token_search
      ? { contains: props.body.token_search, mode: "insensitive" as const }
      : undefined,
    created_at: {
      gte: props.body.created_at_from
        ? new Date(props.body.created_at_from)
        : undefined,
      lte: props.body.created_at_to
        ? new Date(props.body.created_at_to)
        : undefined,
    },
  } satisfies Prisma.todo_app_member_password_resetsWhereInput;
  if (props.body.expired !== undefined) {
    if (props.body.expired) {
      (whereInput as any).expires_at = { lt: new Date() };
    } else {
      (whereInput as any).expires_at = { gte: new Date() };
    }
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_member_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...TodoAppMemberPasswordResetAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.todo_app_member_password_resets.count({
      where: whereInput,
    }),
  ]);
  const transformed = await ArrayUtil.asyncMap(
    data,
    TodoAppMemberPasswordResetAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
