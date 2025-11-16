import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminUsers(props: {
  admin: AdminPayload;
  body: ITodoListUser.IRequest;
}): Promise<IPageITodoListUser.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {
    deleted_at: null,
  };

  if (props.body.search) {
    whereCondition.email = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }

  if (props.body.email) {
    whereCondition.email = {
      contains: props.body.email,
      mode: "insensitive",
    };
  }

  if (
    props.body.email_verified !== undefined &&
    props.body.email_verified !== null
  ) {
    whereCondition.email_verified = props.body.email_verified;
  }

  if (props.body.created_after || props.body.created_before) {
    whereCondition.created_at = {};
    if (props.body.created_after) {
      (whereCondition.created_at as Record<string, unknown>).gte = new Date(
        props.body.created_after,
      );
    }
    if (props.body.created_before) {
      (whereCondition.created_at as Record<string, unknown>).lte = new Date(
        props.body.created_before,
      );
    }
  }

  let orderByField: "created_at" | "email" = "created_at";
  let orderByDirection: "asc" | "desc" = "desc";

  if (props.body.order_by === "email") {
    orderByField = "email";
    orderByDirection = (props.body.order_direction ?? "asc") as "asc" | "desc";
  } else if (props.body.order_by === "created_at") {
    orderByField = "created_at";
    orderByDirection = (props.body.order_direction ?? "desc") as "asc" | "desc";
  }

  const [users, total] = await Promise.all([
    MyGlobal.prisma.todo_list_users.findMany({
      where: whereCondition,
      orderBy: { [orderByField]: orderByDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_users.count({
      where: whereCondition,
    }),
  ]);

  const data: ITodoListUser.ISummary[] = users.map((user) => ({
    id: user.id as string & tags.Format<"uuid">,
    email: user.email,
    email_verified: user.email_verified,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
  }));

  return {
    data,
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
