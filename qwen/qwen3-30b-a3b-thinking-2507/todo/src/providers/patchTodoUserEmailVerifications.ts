import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoUserEmailVerification";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { ITodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoUserEmailVerificationAtSummaryTransformer } from "../transformers/TodoUserEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoUserEmailVerifications(props: {
  user: UserPayload;
  body: ITodoUserEmailVerification.IRequest;
}): Promise<IPageITodoUserEmailVerification.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 10;
  const skip = (page - 1) * pageSize;
  const data = await MyGlobal.prisma.todo_user_email_verifications.findMany({
    where: {
      deleted_at: null,
      todo_user_id: props.user.id,
    },
    skip,
    take: pageSize,
    orderBy: { created_at: "desc" },
    ...TodoUserEmailVerificationAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_user_email_verifications.count({
    where: {
      deleted_at: null,
      todo_user_id: props.user.id,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      TodoUserEmailVerificationAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    } satisfies IPage.IPagination,
  } satisfies IPageITodoUserEmailVerification.ISummary;
}
