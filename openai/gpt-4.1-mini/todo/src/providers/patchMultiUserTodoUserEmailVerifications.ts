import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserEmailVerification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUserEmailVerification";
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

export async function patchMultiUserTodoUserEmailVerifications(props: {
  user: UserPayload;
  body: IMultiUserTodoUserEmailVerification.IRequest;
}): Promise<IPageIMultiUserTodoUserEmailVerification.ISummary> {
  const userId = props.user.id;
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.multi_user_todo_user_email_verifications.findMany({
      where: {
        multi_user_todo_user_id: userId,
      },
      take: limit,
      skip: skip,
      orderBy: {
        created_at: "desc",
      },
    });
  const total =
    await MyGlobal.prisma.multi_user_todo_user_email_verifications.count({
      where: {
        multi_user_todo_user_id: userId,
      },
    });
  const resultData = data.map((item) => ({
    id: item.id,
    token: item.token,
    expiration: toISOStringSafe(item.expires_at),
    verifiedAt:
      item.verified_at !== null ? toISOStringSafe(item.verified_at) : null,
  }));
  return {
    data: resultData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
