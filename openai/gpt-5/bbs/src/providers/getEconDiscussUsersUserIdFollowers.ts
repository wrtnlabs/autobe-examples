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

export async function getEconDiscussUsersUserIdFollowers(props: {
  userId: string & tags.Format<"uuid">;
}): Promise<IPageIEconDiscussUser.ISummary> {
  const target = await MyGlobal.prisma.econ_discuss_users.findFirst({
    where: {
      id: props.userId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!target) throw new HttpException("Not Found", 404);

  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const total = await MyGlobal.prisma.econ_discuss_user_follows.count({
    where: {
      followee_user_id: props.userId,
      deleted_at: null,
      follower: {
        deleted_at: null,
      },
    },
  });

  const rows = await MyGlobal.prisma.econ_discuss_user_follows.findMany({
    where: {
      followee_user_id: props.userId,
      deleted_at: null,
      follower: {
        deleted_at: null,
      },
    },
    orderBy: { created_at: "desc" },
    select: {
      follower: {
        select: {
          id: true,
          display_name: true,
          avatar_uri: true,
        },
      },
    },
    skip,
    take: limit,
  });

  const data = rows.map((r) => ({
    id: typia.assert<string & tags.Format<"uuid">>(r.follower.id),
    displayName: r.follower.display_name,
    avatarUri: r.follower.avatar_uri ?? null,
  }));

  return {
    pagination: {
      current: typia.assert<IPage.IPagination["current"]>(page),
      limit: typia.assert<IPage.IPagination["limit"]>(limit),
      records: typia.assert<IPage.IPagination["records"]>(total),
      pages: typia.assert<IPage.IPagination["pages"]>(Math.ceil(total / limit)),
    },
    data,
  };
}
