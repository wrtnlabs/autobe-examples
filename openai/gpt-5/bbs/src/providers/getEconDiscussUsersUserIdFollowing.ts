import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUser";

export async function getEconDiscussUsersUserIdFollowing(props: {
  userId: string & tags.Format<"uuid">;
}): Promise<IPageIEconDiscussUser.ISummary> {
  const current = 1;
  const limit = 20;

  const [edges, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_user_follows.findMany({
      where: {
        follower_user_id: props.userId,
        deleted_at: null,
        followee: { deleted_at: null },
      },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      skip: (current - 1) * limit,
      take: limit,
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
      where: {
        follower_user_id: props.userId,
        deleted_at: null,
        followee: { deleted_at: null },
      },
    }),
  ]);

  const data = edges.map((row) => ({
    id: row.followee.id,
    displayName: row.followee.display_name,
    avatarUri: row.followee.avatar_uri ?? null,
  }));

  return {
    pagination: {
      current: Number(current),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / limit)),
    },
    data,
  };
}
