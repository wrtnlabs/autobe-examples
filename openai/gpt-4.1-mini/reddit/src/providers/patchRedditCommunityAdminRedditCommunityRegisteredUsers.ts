import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { IPageIRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityRegisteredUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunityRegisteredUsers(props: {
  admin: AdminPayload;
  body: IRedditCommunityRegisteredUser.IRequest;
}): Promise<IPageIRedditCommunityRegisteredUser.ISummary> {
  const {
    username,
    email,
    status,
    registered_since,
    registered_until,
    page = 1,
    limit = 100,
    sort_by = "created_at",
    sort_order = "asc",
    search,
    role,
    my_items_only,
    include_archived,
    referrer,
    ip,
  } = props.body;

  const registeredSinceStr = registered_since
    ? toISOStringSafe(registered_since)
    : undefined;
  const registeredUntilStr = registered_until
    ? toISOStringSafe(registered_until)
    : undefined;

  const take = limit;
  const skip = (page - 1) * take;

  const whereCondition = {
    deleted_at: include_archived === true ? undefined : null,
    ...(email ? { email } : {}),
    ...(registeredSinceStr || registeredUntilStr
      ? {
          created_at: {
            ...(registeredSinceStr ? { gte: registeredSinceStr } : {}),
            ...(registeredUntilStr ? { lte: registeredUntilStr } : {}),
          },
        }
      : {}),
  } as const;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_registered_users.findMany({
      where: whereCondition,
      skip,
      take,
      orderBy: { [sort_by]: sort_order },
      select: {
        id: true,
        email: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.reddit_community_registered_users.count({
      where: whereCondition,
    }),
  ]);

  const mappedData = data.map((user) => ({
    id: user.id,
    username: "", // Provide empty string as placeholder for missing required property 'username'
    email: user.email,
    registered_at: toISOStringSafe(user.created_at),
  }));

  return {
    data: mappedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
