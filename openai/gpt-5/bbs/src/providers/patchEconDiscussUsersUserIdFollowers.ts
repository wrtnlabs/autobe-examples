import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussUserFollow } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUserFollow";
import { IEEconDiscussUserFollowSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussUserFollowSortBy";
import { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import { IPageIEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUser";

export async function patchEconDiscussUsersUserIdFollowers(props: {
  userId: string & tags.Format<"uuid">;
  body: IEconDiscussUserFollow.IRequest;
}): Promise<IPageIEconDiscussUser.ISummary> {
  const { userId, body } = props;

  // Verify target user exists and is active (not soft-deleted)
  const target = await MyGlobal.prisma.econ_discuss_users.findFirst({
    where: { id: userId, deleted_at: null },
    select: { id: true },
  });
  if (!target) throw new HttpException("Not Found", 404);

  const page = Number(body.page);
  const limit = Number(body.pageSize);
  const skip = (page - 1) * limit;

  const sortBy = body.sortBy ?? "created_at";
  const requestedOrder = body.order;
  const order: "asc" | "desc" =
    requestedOrder === "asc" || requestedOrder === "desc"
      ? requestedOrder
      : sortBy === "created_at"
        ? "desc"
        : "asc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_user_follows.findMany({
      where: {
        followee_user_id: userId,
        deleted_at: null,
        ...((body.dateFrom !== undefined && body.dateFrom !== null) ||
        (body.dateTo !== undefined && body.dateTo !== null)
          ? {
              created_at: {
                ...(body.dateFrom !== undefined && body.dateFrom !== null
                  ? { gte: body.dateFrom }
                  : {}),
                ...(body.dateTo !== undefined && body.dateTo !== null
                  ? { lte: body.dateTo }
                  : {}),
              },
            }
          : {}),
        follower: {
          is: {
            deleted_at: null,
            ...(body.q !== undefined && body.q !== null && body.q !== ""
              ? { display_name: { contains: body.q } }
              : {}),
          },
        },
      },
      orderBy:
        sortBy === "created_at"
          ? { created_at: order }
          : { follower: { display_name: order } },
      include: { follower: true },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.econ_discuss_user_follows.count({
      where: {
        followee_user_id: userId,
        deleted_at: null,
        ...((body.dateFrom !== undefined && body.dateFrom !== null) ||
        (body.dateTo !== undefined && body.dateTo !== null)
          ? {
              created_at: {
                ...(body.dateFrom !== undefined && body.dateFrom !== null
                  ? { gte: body.dateFrom }
                  : {}),
                ...(body.dateTo !== undefined && body.dateTo !== null
                  ? { lte: body.dateTo }
                  : {}),
              },
            }
          : {}),
        follower: {
          is: {
            deleted_at: null,
            ...(body.q !== undefined && body.q !== null && body.q !== ""
              ? { display_name: { contains: body.q } }
              : {}),
          },
        },
      },
    }),
  ]);

  const data = rows.map((r) => ({
    id: r.follower.id as string & tags.Format<"uuid">,
    displayName: r.follower.display_name,
    avatarUri:
      r.follower.avatar_uri === null ? undefined : r.follower.avatar_uri,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
