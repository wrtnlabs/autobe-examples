import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdmins(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAdmin.IRequest;
}): Promise<IPageIDiscussionBoardAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build search filter
  const where: Prisma.discussion_board_adminsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { display_name: { contains: props.body.search } },
        { email: { contains: props.body.search } },
      ],
    }),
    ...(props.body.isActive !== undefined && {
      is_active: props.body.isActive,
    }),
    ...(props.body.isSuperAdmin !== undefined && {
      is_super_admin: props.body.isSuperAdmin,
    }),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_admins.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        display_name: true,
        email: true,
        is_super_admin: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_admins.count({ where }),
  ]);
  return {
    data: data.map((admin) => ({
      id: admin.id as string & tags.Format<"uuid">,
      display_name: admin.display_name,
      email: admin.email as string & tags.Format<"email">,
      is_super_admin: admin.is_super_admin,
      is_active: admin.is_active,
      created_at: admin.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updated_at: admin.updated_at.toISOString() as string &
        tags.Format<"date-time">,
      deleted_at: admin.deleted_at?.toISOString() as
        | (string & tags.Format<"date-time">)
        | null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
