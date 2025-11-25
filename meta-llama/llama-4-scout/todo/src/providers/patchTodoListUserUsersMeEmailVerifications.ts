import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserEmailVerification";
import { IPageITodoListUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserEmailVerification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserUsersMeEmailVerifications(props: {
  user: UserPayload;
  body: ITodoListUserEmailVerification.IRequest;
}): Promise<IPageITodoListUserEmailVerification.ISummary> {
  const userId = props.user.id;
  const {
    page = 1,
    limit = 100,
    created_from,
    created_to,
    consumed,
    expired,
  } = props.body;
  const skip = (page - 1) * limit;

  // Build where condition for current user's events
  const where: Record<string, any> = {
    todo_list_user_id: userId,
  };

  if (created_from !== undefined && created_from !== null) {
    where.created_at = where.created_at || {};
    where.created_at.gte = created_from;
  }
  if (created_to !== undefined && created_to !== null) {
    where.created_at = where.created_at || {};
    where.created_at.lte = created_to;
  }
  if (consumed !== undefined && consumed !== null) {
    where.consumed_at = consumed ? { not: null } : null;
  }
  if (expired !== undefined && expired !== null) {
    const now = new Date().toISOString();
    where.expires_at = where.expires_at || {};
    if (expired) {
      where.expires_at.lte = now;
    } else {
      where.expires_at.gte = now;
    }
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user_email_verifications.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_list_user_email_verifications.count({ where }),
  ]);

  // Function to mask verification token: show first 4 and last 2, rest replaced with '*' if longer than 6, else partial mask
  const maskToken = (token: string): string => {
    if (token.length <= 6) return token[0] + "***" + token[token.length - 1];
    return token.slice(0, 4) + "***" + token.slice(-2);
  };

  const data = rows.map((v) => ({
    id: v.id,
    verification_token: maskToken(v.verification_token),
    consumed_at: v.consumed_at ? toISOStringSafe(v.consumed_at) : undefined,
    expires_at: toISOStringSafe(v.expires_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
