import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import { IPageITodoAppGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestuser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { GuestuserPayload } from "../decorators/payload/GuestuserPayload";

export async function patchTodoAppGuestUserGuestUsers(props: {
  guestUser: GuestuserPayload;
  body: ITodoAppGuestUser.IRequest;
}): Promise<IPageITodoAppGuestuser.ISummary> {
  const body = props.body;

  const page: number = body.page !== undefined ? body.page : 1;
  const limit: number = body.limit !== undefined ? body.limit : 20;

  if (page < 1) {
    throw new HttpException("page must be greater than or equal to 1", 400);
  }

  if (limit <= 0) {
    throw new HttpException("limit must be greater than 0", 400);
  }

  const createdFrom: string | undefined = body.created_from;
  const createdTo: string | undefined = body.created_to;

  const createdAtCondition = (() => {
    if (createdFrom !== undefined && createdTo !== undefined) {
      return {
        created_at: {
          gte: createdFrom,
          lte: createdTo,
        },
      };
    }
    if (createdFrom !== undefined) {
      return {
        created_at: {
          gte: createdFrom,
        },
      };
    }
    if (createdTo !== undefined) {
      return {
        created_at: {
          lte: createdTo,
        },
      };
    }
    return {};
  })();

  const where = {
    deleted_at: null,
    ...createdAtCondition,
  };

  const orderByField: string =
    body.order_by !== undefined ? body.order_by : "created_at";
  if (orderByField !== "created_at" && orderByField !== "updated_at") {
    throw new HttpException(
      "order_by must be one of: created_at, updated_at",
      400,
    );
  }

  const directionRaw: string =
    body.order_direction !== undefined
      ? body.order_direction.toLowerCase()
      : "desc";
  if (directionRaw !== "asc" && directionRaw !== "desc") {
    throw new HttpException("order_direction must be one of: asc, desc", 400);
  }

  const orderBy = {
    [orderByField]: directionRaw,
  };

  const skip: number = (page - 1) * limit;

  const [rows, totalCount] = await Promise.all([
    MyGlobal.prisma.todo_app_guestusers.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_app_guestusers.count({
      where,
    }),
  ]);

  const data: ITodoAppGuestUser.ISummary[] = rows.map((row) => ({
    id: row.id,
    display_name: row.display_name,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  const pages: number = Math.ceil(totalCount / limit);

  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records: totalCount,
    pages,
  };

  return {
    pagination,
    data,
  };
}
