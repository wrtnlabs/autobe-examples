import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import { IPageIDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminuser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchDiscussionBoardAdminUserAdminUsers(props: {
  adminUser: AdminuserPayload;
  body: IDiscussionBoardAdminuser.IRequest;
}): Promise<IPageIDiscussionBoardAdminuser.ISummary> {
  const pageInput = props.body.page;
  const limitInput = props.body.limit;

  const page = pageInput === undefined ? 1 : pageInput;
  const limit = limitInput === undefined ? 20 : limitInput;

  const skip = (page - 1) * limit;

  const where: Prisma.discussion_board_adminusersWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined && {
      account_status: props.body.status,
    }),
    ...(props.body.role !== undefined && {
      role: props.body.role,
    }),
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        OR: [
          {
            email: {
              contains: props.body.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            display_name: {
              contains: props.body.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }),
  };

  const orderByField = props.body.orderBy;
  const direction: Prisma.SortOrder =
    props.body.orderDirection === undefined
      ? "desc"
      : props.body.orderDirection;

  const orderBy: Prisma.discussion_board_adminusersOrderByWithRelationInput =
    orderByField === "createdAt"
      ? { created_at: direction }
      : orderByField === "email"
        ? { email: direction }
        : { created_at: "desc" };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_adminusers.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        email: true,
        display_name: true,
        // profile_image_url does not exist on the Prisma model, so we don't select it
        email_verified: true,
        account_status: true,
        created_at: true,
        last_login_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_adminusers.count({
      where,
    }),
  ]);

  const data: IDiscussionBoardAdminuser.ISummary[] = rows.map((row) => {
    const lastLoginAtValue = row.last_login_at;

    return {
      id: row.id,
      email: row.email,
      display_name: row.display_name,
      // Prisma row has no profile_image_url column; expose undefined to satisfy summary type
      profile_image_url: undefined,
      email_verified: row.email_verified,
      account_status: row.account_status,
      created_at: toISOStringSafe(row.created_at),
      last_login_at:
        lastLoginAtValue === null
          ? undefined
          : toISOStringSafe(lastLoginAtValue),
    };
  });

  const records = total;
  const pages = records === 0 ? 0 : Math.ceil(records / limit);

  const pagination: IPage.IPagination = {
    current: page - 1,
    limit,
    records,
    pages,
  };

  return {
    pagination,
    data,
  };
}
