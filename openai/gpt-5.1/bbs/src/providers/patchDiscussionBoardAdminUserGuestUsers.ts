import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestUser";
import { IPageIDiscussionBoardGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuestuser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchDiscussionBoardAdminUserGuestUsers(props: {
  adminUser: AdminuserPayload;
  body: IDiscussionBoardGuestUser.IRequest;
}): Promise<IPageIDiscussionBoardGuestuser.ISummary> {
  // Derive pagination parameters with defaults and caps
  const requestedPage = props.body.page !== undefined ? props.body.page : 1;
  const requestedLimit = props.body.limit !== undefined ? props.body.limit : 20;

  const maxLimit = 100;
  const effectiveLimit = requestedLimit > maxLimit ? maxLimit : requestedLimit;
  const pageIndex = requestedPage > 0 ? requestedPage - 1 : 0;
  const skip = pageIndex * effectiveLimit;

  // Build where condition using object spread and IRequest filters.
  // Extracted into a constant for reuse in findMany and count.
  const where = {
    // created_at range
    ...(props.body.created_from !== undefined &&
    props.body.created_from !== null
      ? {
          created_at: {
            gte: props.body.created_from,
            ...(props.body.created_to !== undefined &&
            props.body.created_to !== null
              ? { lte: props.body.created_to }
              : {}),
          },
        }
      : props.body.created_to !== undefined && props.body.created_to !== null
        ? {
            created_at: {
              lte: props.body.created_to,
            },
          }
        : {}),

    // updated_at range
    ...(props.body.updated_from !== undefined &&
    props.body.updated_from !== null
      ? {
          updated_at: {
            gte: props.body.updated_from,
            ...(props.body.updated_to !== undefined &&
            props.body.updated_to !== null
              ? { lte: props.body.updated_to }
              : {}),
          },
        }
      : props.body.updated_to !== undefined && props.body.updated_to !== null
        ? {
            updated_at: {
              lte: props.body.updated_to,
            },
          }
        : {}),

    // deleted_at range: only constrain when deleted_from or deleted_to is non-null
    ...(props.body.deleted_from !== undefined &&
    props.body.deleted_from !== null
      ? {
          deleted_at: {
            gte: props.body.deleted_from,
            ...(props.body.deleted_to !== undefined &&
            props.body.deleted_to !== null
              ? { lte: props.body.deleted_to }
              : {}),
          },
        }
      : props.body.deleted_to !== undefined && props.body.deleted_to !== null
        ? {
            deleted_at: {
              lte: props.body.deleted_to,
            },
          }
        : {}),

    // anonymous_token equality filter
    ...(props.body.anonymous_token !== undefined &&
    props.body.anonymous_token !== null
      ? { anonymous_token: props.body.anonymous_token }
      : {}),
  };

  // Determine ordering
  const orderByField: "created_at" | "updated_at" | "deleted_at" =
    props.body.order_by !== undefined ? props.body.order_by : "created_at";

  const orderDirection: "asc" | "desc" =
    props.body.order_direction !== undefined
      ? props.body.order_direction
      : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_guestusers.findMany({
      where,
      orderBy: {
        [orderByField]: orderDirection,
      },
      skip,
      take: effectiveLimit,
    }),
    MyGlobal.prisma.discussion_board_guestusers.count({
      where,
    }),
  ]);

  const paginationRecords = total >= 0 ? total : 0;
  const paginationLimit = effectiveLimit >= 0 ? effectiveLimit : 0;
  const paginationCurrent = pageIndex >= 0 ? pageIndex : 0;
  const paginationPages =
    paginationLimit === 0 || paginationRecords === 0
      ? 0
      : Math.ceil(paginationRecords / paginationLimit);

  const data: IDiscussionBoardGuestUser.ISummary[] = rows.map((row) => {
    const deletedAtValue =
      row.deleted_at !== null ? toISOStringSafe(row.deleted_at) : null;

    const summary: IDiscussionBoardGuestUser.ISummary = {
      id: row.id,
      anonymous_token: row.anonymous_token,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: deletedAtValue,
    };

    return summary;
  });

  const pagination: IPage.IPagination = {
    current: paginationCurrent,
    limit: paginationLimit,
    records: paginationRecords,
    pages: paginationPages,
  };

  return {
    pagination,
    data,
  };
}
