import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoGuestAtSummaryTransformer } from "../transformers/MultiUserTodoGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoGuests(props: {
  body: IMultiUserTodoGuest.IRequest;
}): Promise<IPageIMultiUserTodoGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const status = props.body.status;
  const search = props.body.search;
  const buildWhereInput = (
    statusValue: string | undefined,
    searchValue: string | undefined,
  ): Prisma.multi_user_todo_guestsWhereInput => {
    const where: Prisma.multi_user_todo_guestsWhereInput = {
      deleted_at: null,
    };
    if (statusValue !== undefined && statusValue !== "all") {
      switch (statusValue) {
        case "active":
        case "expired":
        case "deleted":
          where.status = statusValue;
          break;
      }
    }
    if (searchValue !== undefined && searchValue.length > 0) {
      if (searchValue.includes("..")) {
        const [start, end] = searchValue.split("..");
        const startOnly = start?.trim();
        const endOnly = end?.trim();
        if (startOnly !== undefined && startOnly.length > 0) {
          const startOnlyWithTime =
            startOnly.length >= 10 ? startOnly : startOnly + "T00:00:00Z";
          where.created_at = where.created_at
            ? Object.assign({}, where.created_at, { gte: startOnlyWithTime })
            : { gte: startOnlyWithTime };
        }
        if (endOnly !== undefined && endOnly.length > 0) {
          const endOnlyWithTime =
            endOnly.length >= 10 ? endOnly : endOnly + "T23:59:59Z";
          where.created_at = where.created_at
            ? Object.assign({}, where.created_at, { lte: endOnlyWithTime })
            : { lte: endOnlyWithTime };
        }
      } else {
        const dateOnlyWithTime =
          searchValue.length >= 10 ? searchValue : searchValue + "T00:00:00Z";
        where.created_at = {
          gte: dateOnlyWithTime,
          lte: dateOnlyWithTime + "T23:59:59Z",
        };
      }
    }
    return where;
  };
  const whereInput = buildWhereInput(status, search);
  const records = await MyGlobal.prisma.multi_user_todo_guests.findMany({
    where: whereInput,
    orderBy: { created_at: "desc" as const },
    skip: (page - 1) * limit,
    take: limit,
    ...MultiUserTodoGuestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.multi_user_todo_guests.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      MultiUserTodoGuestAtSummaryTransformer.transform,
    ),
  };
}
