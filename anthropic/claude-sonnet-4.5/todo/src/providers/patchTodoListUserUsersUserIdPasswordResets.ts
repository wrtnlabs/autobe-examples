import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";
import { IPageITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListPasswordReset";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserUsersUserIdPasswordResets(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListPasswordReset.IRequest;
}): Promise<IPageITodoListPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const buildWhereCondition = () => {
    const where: Record<string, unknown> = {
      todo_list_user_id: props.userId,
    };

    if (props.body.email !== undefined) {
      where.user = {
        email: props.body.email,
      };
    }

    if (props.body.used !== undefined) {
      where.used = props.body.used;
    }

    const createdAtConditions: Record<string, unknown> = {};
    if (props.body.created_after !== undefined) {
      createdAtConditions.gte = new Date(props.body.created_after);
    }
    if (props.body.created_before !== undefined) {
      createdAtConditions.lte = new Date(props.body.created_before);
    }
    if (Object.keys(createdAtConditions).length > 0) {
      where.created_at = createdAtConditions;
    }

    const expiresAtConditions: Record<string, unknown> = {};
    if (props.body.expires_after !== undefined) {
      expiresAtConditions.gte = new Date(props.body.expires_after);
    }
    if (props.body.expires_before !== undefined) {
      expiresAtConditions.lte = new Date(props.body.expires_before);
    }
    if (Object.keys(expiresAtConditions).length > 0) {
      where.expires_at = expiresAtConditions;
    }

    return where;
  };

  const buildOrderBy = () => {
    if (props.body.sort === "created_at_asc") {
      return { created_at: "asc" as const };
    } else if (props.body.sort === "created_at_desc") {
      return { created_at: "desc" as const };
    } else if (props.body.sort === "expires_at_asc") {
      return { expires_at: "asc" as const };
    } else if (props.body.sort === "expires_at_desc") {
      return { expires_at: "desc" as const };
    }
    return { created_at: "desc" as const };
  };

  const whereCondition = buildWhereCondition();
  const orderBy = buildOrderBy();

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_password_resets.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    }),
    MyGlobal.prisma.todo_list_password_resets.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: data.map((reset) => ({
      id: reset.id,
      todo_list_user_id: reset.todo_list_user_id,
      email: reset.user.email,
      token: reset.token,
      created_at: toISOStringSafe(reset.created_at),
      expires_at: toISOStringSafe(reset.expires_at),
      used: reset.used,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
