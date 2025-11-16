import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminAdmins(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdmin.IRequest;
}): Promise<IPageIDiscussionBoardAdmin.ISummary> {
  const {
    email,
    is_email_verified,
    is_active,
    is_blocked,
    created_from,
    created_to,
    page = 1,
    page_size = 100,
    order_by = "created_at",
    order_direction = "desc",
  } = props.body;

  // Build filter conditions
  const where: Record<string, any> = {
    ...(typeof email === "string" && { email }),
    ...(typeof is_email_verified === "boolean" && { is_email_verified }),
    ...(typeof is_active === "boolean" && { is_active }),
    ...(typeof is_blocked === "boolean" && { is_blocked }),
    ...((created_from || created_to) && {
      created_at: {
        ...(created_from && { gte: created_from }),
        ...(created_to && { lte: created_to }),
      },
    }),
    deleted_at: null, // Soft-deletion: only active (non-deleted) admins
  };

  // Sorting
  const orderBy = [{ [order_by]: order_direction }];

  const skip = (page - 1) * page_size;
  const take = page_size;

  // Fetch results & total count concurrently
  const [admins, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_admins.findMany({
      where,
      skip,
      take,
      orderBy,
      select: {
        id: true,
        email: true,
      },
    }),
    MyGlobal.prisma.discussion_board_admins.count({ where }),
  ]);

  // Summary info for response: display_name is the admin's email
  const data = admins.map((admin) => ({
    id: admin.id,
    display_name: admin.email,
  }));

  // Pagination metadata
  const pages = total === 0 ? 0 : Math.ceil(total / page_size);
  return {
    pagination: {
      current: page,
      limit: page_size,
      records: total,
      pages,
    },
    data,
  };
}
