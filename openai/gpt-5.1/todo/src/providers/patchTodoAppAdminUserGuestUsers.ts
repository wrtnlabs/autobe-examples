import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import { IPageITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchTodoAppAdminUserGuestUsers(props: {
  adminUser: AdminuserPayload;
  body: ITodoAppGuestUser.IRequest;
}): Promise<IPageITodoAppGuestUser.ISummary> {
  // Extract and normalize pagination parameters
  const rawPage = props.body.page;
  const rawLimit = props.body.limit;

  const defaultPage = 1;
  const defaultLimit = 50;
  const maxLimit = 100;

  const page = rawPage === undefined ? defaultPage : rawPage;
  const normalizedLimit = rawLimit === undefined ? defaultLimit : rawLimit;
  const limit = normalizedLimit > maxLimit ? maxLimit : normalizedLimit;

  const skip = (page - 1) * limit;

  // Build filtering conditions for Prisma where clause
  const fromCreatedAt = props.body.fromCreatedAt;
  const toCreatedAt = props.body.toCreatedAt;
  const externalRef = props.body.externalRef;

  const createdAtCondition = (() => {
    if (fromCreatedAt === undefined && toCreatedAt === undefined) {
      return undefined;
    }

    const range: { gte?: string; lte?: string } = {};

    if (fromCreatedAt !== undefined && fromCreatedAt !== null) {
      range.gte = fromCreatedAt;
    }

    if (toCreatedAt !== undefined && toCreatedAt !== null) {
      range.lte = toCreatedAt;
    }

    if (range.gte === undefined && range.lte === undefined) {
      return undefined;
    }

    return range;
  })();

  const where = {
    ...(createdAtCondition !== undefined && {
      created_at: createdAtCondition,
    }),
    ...(externalRef !== undefined &&
      externalRef !== null && {
        external_ref: externalRef,
      }),
  };

  // Determine sorting configuration
  const sortBy = props.body.sortBy;
  const sortDirection = props.body.sortDirection;

  type SortField = "created_at" | "id";
  type SortOrder = "asc" | "desc";

  const defaultSortField: SortField = "created_at";
  const defaultSortOrder: SortOrder = "desc";

  const resolvedSortField: SortField =
    sortBy === "id" || sortBy === "created_at" ? sortBy : defaultSortField;
  const resolvedSortOrder: SortOrder =
    sortDirection === "asc" || sortDirection === "desc"
      ? sortDirection
      : defaultSortOrder;

  const orderBy = {
    [resolvedSortField]: resolvedSortOrder,
  };

  // Execute queries concurrently
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

  const data = rows.map((row): ITodoAppGuestUser.ISummary => {
    return {
      id: row.id,
      external_ref: row.external_ref ?? null,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    };
  });

  const pages = Math.ceil(totalCount / limit);

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
