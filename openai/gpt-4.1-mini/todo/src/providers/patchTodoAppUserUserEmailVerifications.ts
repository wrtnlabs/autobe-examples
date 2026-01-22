import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
import { IPageITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserEmailVerification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserUserEmailVerifications(props: {
  user: UserPayload;
  body: ITodoAppUserEmailVerification.IRequest;
}): Promise<IPageITodoAppUserEmailVerification.ISummary> {
  const {
    verificationStatus,
    verificationCode,
    // ignoring userId from request body for authorization
    startDate,
    endDate,
    page,
    pageSize,
  } = props.body;
  if (page < 1) {
    throw new HttpException("page must be at least 1", 400);
  }
  if (pageSize < 1 || pageSize > 200) {
    throw new HttpException("pageSize must be between 1 and 200", 400);
  }
  const filterUserId = props.user.id;
  const whereCondition = {
    user_id: filterUserId,
    ...(verificationStatus !== undefined &&
    verificationStatus !== null &&
    verificationStatus !== ""
      ? { verification_status: verificationStatus }
      : {}),
    ...(verificationCode !== undefined &&
    verificationCode !== null &&
    verificationCode !== ""
      ? { verification_code: verificationCode }
      : {}),
    ...(startDate || endDate
      ? {
          created_at: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        }
      : {}),
  } satisfies Prisma.todo_app_user_email_verificationsWhereInput;
  const skip = (page - 1) * pageSize;
  const data = await MyGlobal.prisma.todo_app_user_email_verifications.findMany(
    {
      where: whereCondition,
      skip,
      take: pageSize,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        user_id: true,
        token: true,
        token_expired_at: true,
        verified_at: true,
        created_at: true,
        deleted_at: true,
      },
    },
  );
  const total = await MyGlobal.prisma.todo_app_user_email_verifications.count({
    where: whereCondition,
  });
  return {
    data: data.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      user_id: item.user_id as string & tags.Format<"uuid">,
      token: item.token,
      token_expired_at: item.token_expired_at as unknown as string &
        tags.Format<"date-time">,
      verified_at: item.verified_at
        ? (item.verified_at as unknown as string & tags.Format<"date-time">)
        : null,
      created_at: item.created_at as unknown as string &
        tags.Format<"date-time">,
      deleted_at: item.deleted_at
        ? (item.deleted_at as unknown as string & tags.Format<"date-time">)
        : null,
    })),
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    } satisfies IPage.IPagination,
  };
}
