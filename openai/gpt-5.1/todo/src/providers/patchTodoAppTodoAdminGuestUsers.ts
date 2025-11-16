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
import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function patchTodoAppTodoAdminGuestUsers(props: {
  todoAdmin: TodoadminPayload;
  body: ITodoAppGuestUser.IRequest;
}): Promise<IPageITodoAppGuestuser.ISummary> {
  const body = props.body;

  const pageInput = body.page === undefined ? 1 : body.page;
  const limitInput = body.limit === undefined ? 100 : body.limit;

  const safePage = pageInput < 1 ? 1 : pageInput;
  const safeLimit = limitInput < 1 ? 100 : limitInput;

  const skip = (safePage - 1) * safeLimit;

  const whereCondition = (() => {
    const andConditions: { [key: string]: unknown }[] = [];

    // Status filtering: statusList takes precedence over single status
    if (body.statusList !== undefined) {
      if (body.statusList.length > 0) {
        andConditions.push({
          status: {
            in: body.statusList,
          },
        });
      }
    } else if (body.status !== undefined) {
      andConditions.push({
        status: body.status,
      });
    }

    if (body.externalReference !== undefined) {
      andConditions.push({
        external_reference: body.externalReference,
      });
    }

    if (body.externalReferenceLike !== undefined) {
      andConditions.push({
        external_reference: {
          contains: body.externalReferenceLike,
        },
      });
    }

    if (body.displayNameLike !== undefined) {
      andConditions.push({
        display_name: {
          contains: body.displayNameLike,
        },
      });
    }

    if (body.createdFrom !== undefined || body.createdTo !== undefined) {
      const createdAtRange: {
        gte?: string & tags.Format<"date-time">;
        lte?: string & tags.Format<"date-time">;
      } = {};

      if (body.createdFrom !== undefined) {
        createdAtRange.gte = body.createdFrom;
      }
      if (body.createdTo !== undefined) {
        createdAtRange.lte = body.createdTo;
      }

      andConditions.push({
        created_at: createdAtRange,
      });
    }

    if (andConditions.length === 0) {
      return {};
    }

    return {
      AND: andConditions,
    };
  })();

  const orderField =
    body.orderBy === undefined || body.orderBy === null
      ? "created_at"
      : body.orderBy;
  const orderDirection =
    body.orderDirection === undefined || body.orderDirection === null
      ? "desc"
      : body.orderDirection;

  const orderBy: Prisma.todo_app_guestusersOrderByWithRelationInput = (() => {
    const direction: Prisma.SortOrder =
      orderDirection === "asc" ? "asc" : "desc";

    if (orderField === "created_at") {
      return {
        created_at: direction,
      } satisfies Prisma.todo_app_guestusersOrderByWithRelationInput as Prisma.todo_app_guestusersOrderByWithRelationInput;
    }
    if (orderField === "updated_at") {
      return {
        updated_at: direction,
      } satisfies Prisma.todo_app_guestusersOrderByWithRelationInput as Prisma.todo_app_guestusersOrderByWithRelationInput;
    }
    if (orderField === "status") {
      return {
        status: direction,
      } satisfies Prisma.todo_app_guestusersOrderByWithRelationInput as Prisma.todo_app_guestusersOrderByWithRelationInput;
    }
    if (orderField === "display_name") {
      return {
        display_name: direction,
      } satisfies Prisma.todo_app_guestusersOrderByWithRelationInput as Prisma.todo_app_guestusersOrderByWithRelationInput;
    }
    if (orderField === "external_reference") {
      return {
        external_reference: direction,
      } satisfies Prisma.todo_app_guestusersOrderByWithRelationInput as Prisma.todo_app_guestusersOrderByWithRelationInput;
    }

    // Fallback to created_at when an unsupported orderBy is provided
    return {
      created_at: "desc" as Prisma.SortOrder,
    } satisfies Prisma.todo_app_guestusersOrderByWithRelationInput as Prisma.todo_app_guestusersOrderByWithRelationInput;
  })();

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_guestusers.findMany({
      where: whereCondition,
      skip: skip,
      take: safeLimit,
      orderBy: orderBy,
    }),
    MyGlobal.prisma.todo_app_guestusers.count({
      where: whereCondition,
    }),
  ]);

  const data: ITodoAppGuestUser.ISummary[] = rows.map((row) => {
    const external_reference =
      row.external_reference === null ? null : row.external_reference;
    const display_name = row.display_name === null ? null : row.display_name;

    return {
      id: row.id,
      external_reference: external_reference,
      display_name: display_name,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    };
  });

  const effectiveLimit: number & tags.Type<"int32"> & tags.Minimum<0> =
    safeLimit satisfies number as number;
  const totalPages = total === 0 ? 0 : Math.ceil(total / effectiveLimit);
  const currentIndex = total === 0 ? 0 : safePage - 1;

  const pagination: IPage.IPagination = {
    current: currentIndex,
    limit: effectiveLimit,
    records: total,
    pages: totalPages,
  };

  return {
    pagination: pagination,
    data: data,
  };
}
