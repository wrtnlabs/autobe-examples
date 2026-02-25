import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdmin";
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

export async function patchDiscussionBoardSuperAdminSuperAdmins(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSuperAdmin.IRequest;
}): Promise<IPageIDiscussionBoardSuperAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.discussion_board_super_adminsWhereInput = {
    deleted_at: null,
    ...(props.body.email && {
      email: { contains: props.body.email, mode: "insensitive" },
    }),
    ...(props.body.name && {
      name: { contains: props.body.name, mode: "insensitive" },
    }),
    ...(props.body.isActive !== undefined && {
      is_active: props.body.isActive,
    }),
    ...(props.body.isSuperAdmin !== undefined && {
      is_super_admin: props.body.isSuperAdmin,
    }),
  } satisfies Prisma.discussion_board_super_adminsWhereInput;
  const orderByInput = (() => {
    if (props.body.sortBy === "created_at") {
      return {
        created_at: props.body.sortOrder === "asc" ? "asc" : "desc",
      } satisfies Prisma.discussion_board_super_adminsOrderByWithRelationInput;
    } else if (props.body.sortBy === "email") {
      return {
        email: props.body.sortOrder === "asc" ? "asc" : "desc",
      } satisfies Prisma.discussion_board_super_adminsOrderByWithRelationInput;
    }
    return {
      created_at: "desc",
    } satisfies Prisma.discussion_board_super_adminsOrderByWithRelationInput;
  })();
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_super_admins.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        email: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_super_admins.count({
      where: whereConditions,
    }),
  ]);
  return {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      email: record.email,
      created_at: record.created_at.toISOString() as string &
        tags.Format<"date-time">,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
