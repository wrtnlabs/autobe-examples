import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUser";
import { IEEconDiscussUserSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussUserSortBy";
import { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import { IPageIEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchEconDiscussUsersUserIdFollowing(props: {
  userId: string & tags.Format<"uuid">;
  body: IEconDiscussUser.IRequest;
}): Promise<IPageIEconDiscussUser.ISummary> {
  const { userId, body } = props;

  const page = Number(body.page);
  const pageSize = Number(body.pageSize);
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const order: "asc" | "desc" =
    body.order === "asc" ? "asc" : body.order === "desc" ? "desc" : "desc";
  const sortBy: "created_at" | "display_name" | "reputation" =
    body.sortBy === "display_name"
      ? "display_name"
      : body.sortBy === "reputation"
        ? "reputation"
        : "created_at";

  const buildWhere = () => {
    return {
      follower_user_id: userId,
      deleted_at: null,
      ...(() => {
        const followeeConds: Record<string, unknown> = {};
        if (body.q !== undefined && body.q !== null && body.q !== "") {
          followeeConds.display_name = { contains: body.q };
        }
        if (body.isExpertOnly === true) {
          followeeConds.econ_discuss_verified_experts = {
            is: { deleted_at: null },
          };
        }
        return Object.keys(followeeConds).length > 0
          ? { followee: followeeConds }
          : {};
      })(),
    };
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_user_follows.findMany({
      where: buildWhere(),
      orderBy:
        sortBy === "created_at"
          ? { created_at: order }
          : sortBy === "display_name"
            ? { followee: { display_name: order } }
            : { followee: { econ_discuss_user_reputations: { score: order } } },
      skip,
      take,
      select: {
        followee: {
          select: {
            id: true,
            display_name: true,
            avatar_uri: true,
          },
        },
      },
    }),
    MyGlobal.prisma.econ_discuss_user_follows.count({
      where: buildWhere(),
    }),
  ]);

  const data = rows.map((r) => ({
    id: r.followee.id,
    displayName: r.followee.display_name,
    avatarUri: r.followee.avatar_uri ?? null,
  }));

  const pages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: Number(total),
      pages: Number(pages),
    },
    data,
  };
}
