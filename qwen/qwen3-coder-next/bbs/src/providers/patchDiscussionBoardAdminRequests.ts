import { IDiscussionBoardAdminsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminsRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdminsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminsRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminRequests(props: {
  body: IDiscussionBoardAdminsRequest.IRequest;
}): Promise<IPageIDiscussionBoardAdminsRequest.ISummary> {
  const page = 1; // Default page
  const limit = 100; // Default limit
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_admins_requests.findMany({
      where: {
        status: "pending",
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      include: {
        member: true,
        admin: true,
        superAdmin: true,
      },
    }),
    MyGlobal.prisma.discussion_board_admins_requests.count({
      where: {
        status: "pending",
        deleted_at: null,
      },
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      member_id: record.member_id,
      admin_id: record.admin_id,
      super_admin_id: record.super_admin_id,
      reason: record.reason,
      status: record.status,
      created_at: toISOStringSafe(record.created_at),
      approved_at: null,
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: null,
      member: {
        id: record.member.id,
        email: record.member.email,
        display_name: record.member.display_name,
        bio: record.member.bio,
        created_at: toISOStringSafe(record.member.created_at),
        updated_at: toISOStringSafe(record.member.updated_at),
        deleted_at: null,
      },
      admin: record.admin
        ? {
            id: record.admin.id,
            email: record.admin.email,
            display_name: record.admin.display_name,
            bio: record.admin.bio,
            created_at: toISOStringSafe(record.admin.assigned_at),
            updated_at: toISOStringSafe(record.admin.assigned_at),
            deleted_at: null,
          }
        : null,
      superAdmin: record.superAdmin
        ? {
            id: record.superAdmin.id,
            email: record.superAdmin.email,
            display_name: record.superAdmin.display_name,
            bio: record.superAdmin.bio,
            created_at: toISOStringSafe(record.superAdmin.created_at),
            updated_at: toISOStringSafe(record.superAdmin.updated_at),
            deleted_at: null,
          }
        : null,
    })),
  };
}
