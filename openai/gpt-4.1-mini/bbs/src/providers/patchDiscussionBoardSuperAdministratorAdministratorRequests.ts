import { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdministratorAdministratorRequests(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardAdministratorRequest.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorRequest.ISummary> {
  const statusFilter = props.body.status ?? "pending";
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const skip = (page - 1) * limit;
  const [requests, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_administrator_requests.findMany({
      where: {
        status: statusFilter,
        deleted_at: null,
      },
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        registeredUser: {
          select: {
            id: true,
            email: true,
            display_name: true,
            bio: true,
            is_banned: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_administrator_requests.count({
      where: {
        status: statusFilter,
        deleted_at: null,
      },
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: requests.map((r) => ({
      id: r.id,
      reason: r.reason,
      status: r.status,
      createdAt: toISOStringSafe(r.created_at),
      updatedAt: toISOStringSafe(r.updated_at),
      deletedAt: r.deleted_at === null ? null : toISOStringSafe(r.deleted_at),
      registeredUser: {
        id: r.registeredUser.id,
        email: r.registeredUser.email,
        displayName: r.registeredUser.display_name,
        bio: r.registeredUser.bio === null ? null : r.registeredUser.bio,
        isBanned: r.registeredUser.is_banned,
        createdAt: toISOStringSafe(r.registeredUser.created_at),
        updatedAt: toISOStringSafe(r.registeredUser.updated_at),
        deletedAt:
          r.registeredUser.deleted_at === null
            ? null
            : toISOStringSafe(r.registeredUser.deleted_at),
      },
    })),
  };
}
