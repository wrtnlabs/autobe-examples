import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import { IPageIDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberuser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchDiscussionBoardAdminUserMemberUsers(props: {
  adminUser: AdminuserPayload;
  body: IDiscussionBoardMemberuser.IRequest;
}): Promise<IPageIDiscussionBoardMemberuser.ISummary> {
  // Normalize pagination (request is 1-based page index)
  const page: number = props.body.page === undefined ? 1 : props.body.page;
  const pageSize: number =
    props.body.page_size === undefined ? 20 : props.body.page_size;

  const safePage: number = page < 1 ? 1 : page;
  const safePageSize: number =
    pageSize < 1 ? 20 : pageSize > 100 ? 100 : pageSize;

  const skip: number = (safePage - 1) * safePageSize;
  const take: number = safePageSize;

  // Normalize ordering
  const allowedOrderBy: string[] = [
    "created_at",
    "last_login_at",
    "email",
    "display_name",
  ];

  const requestedOrderBy: string | undefined = props.body.order_by;
  const orderByField: string =
    requestedOrderBy !== undefined && allowedOrderBy.includes(requestedOrderBy)
      ? requestedOrderBy
      : "created_at";

  const requestedDirection: "asc" | "desc" | undefined =
    props.body.order_direction;

  const direction: "asc" | "desc" =
    requestedDirection === "asc" || requestedDirection === "desc"
      ? requestedDirection
      : "desc";

  // Build where condition inline following Prisma inline parameter rule
  const where = (() => {
    // Base: only non-deleted accounts
    const base: Prisma.discussion_board_memberusersWhereInput = {
      deleted_at: null,
    };

    // Email verification filter
    const withEmailVerified: Prisma.discussion_board_memberusersWhereInput =
      props.body.email_verified === undefined ||
      props.body.email_verified === null
        ? base
        : {
            ...base,
            email_verified: props.body.email_verified,
          };

    // Account status filter
    const withStatuses: Prisma.discussion_board_memberusersWhereInput =
      props.body.account_statuses === undefined ||
      props.body.account_statuses.length === 0
        ? withEmailVerified
        : {
            ...withEmailVerified,
            account_status: {
              in: props.body.account_statuses,
            },
          };

    // Created_at range filter
    const withCreatedRange: Prisma.discussion_board_memberusersWhereInput =
      props.body.created_from === undefined &&
      props.body.created_to === undefined
        ? withStatuses
        : props.body.created_from === null && props.body.created_to === null
          ? withStatuses
          : {
              ...withStatuses,
              created_at: {
                ...(props.body.created_from === undefined ||
                props.body.created_from === null
                  ? {}
                  : { gte: props.body.created_from }),
                ...(props.body.created_to === undefined ||
                props.body.created_to === null
                  ? {}
                  : { lte: props.body.created_to }),
              },
            };

    // last_login_at range filter
    const withLastLoginRange: Prisma.discussion_board_memberusersWhereInput =
      props.body.last_login_from === undefined &&
      props.body.last_login_to === undefined
        ? withCreatedRange
        : props.body.last_login_from === null &&
            props.body.last_login_to === null
          ? withCreatedRange
          : {
              ...withCreatedRange,
              last_login_at: {
                ...(props.body.last_login_from === undefined ||
                props.body.last_login_from === null
                  ? {}
                  : { gte: props.body.last_login_from }),
                ...(props.body.last_login_to === undefined ||
                props.body.last_login_to === null
                  ? {}
                  : { lte: props.body.last_login_to }),
              },
            };

    // Free-text search across key profile fields
    const search: string | undefined = props.body.search;

    if (search === undefined || search === "") return withLastLoginRange;

    const withSearch: Prisma.discussion_board_memberusersWhereInput = {
      ...withLastLoginRange,
      OR: [
        { email: { contains: search, mode: "insensitive" } },
        { display_name: { contains: search, mode: "insensitive" } },
        { bio: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ],
    };

    return withSearch;
  })();

  // Build orderBy object without type assertions
  let orderBy:
    | Prisma.discussion_board_memberusersOrderByWithRelationInput
    | Prisma.discussion_board_memberusersOrderByWithRelationInput[];

  if (orderByField === "email") {
    orderBy = { email: direction };
  } else if (orderByField === "display_name") {
    orderBy = { display_name: direction };
  } else if (orderByField === "last_login_at") {
    orderBy = { last_login_at: direction };
  } else {
    // default and "created_at" path
    orderBy = { created_at: direction };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_memberusers.findMany({
      where,
      skip,
      take,
      orderBy,
      select: {
        id: true,
        display_name: true,
        account_status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_memberusers.count({
      where,
    }),
  ]);

  const effectiveLimit: number = safePageSize;
  const records: number = total;
  const pages: number =
    effectiveLimit === 0 || records === 0
      ? 0
      : Math.ceil(records / effectiveLimit);

  const pagination: IPage.IPagination = {
    current: safePage - 1,
    limit: effectiveLimit,
    records,
    pages,
  };

  const data: IDiscussionBoardMemberuser.ISummary[] = rows.map((row) => ({
    id: row.id,
    display_name: row.display_name,
    account_status: row.account_status,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination,
    data,
  };
}
