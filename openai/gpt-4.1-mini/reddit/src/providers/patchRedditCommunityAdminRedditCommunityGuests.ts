import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunityGuests(props: {
  admin: AdminPayload;
  body: IRedditCommunityGuest.IRequest;
}): Promise<IPageIRedditCommunityGuest.ISummary> {
  const { body } = props;

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  const where = {
    ...(body.session_id !== undefined &&
      body.session_id !== null && {
        session_id: body.session_id,
      }),
    ...(body.ip_address !== undefined &&
      body.ip_address !== null && {
        ip_address: body.ip_address,
      }),
    ...(body.user_agent !== undefined &&
      body.user_agent !== null && {
        user_agent: body.user_agent,
      }),
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_guests.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        session_id: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.reddit_community_guests.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((guest) => ({
      id: guest.id,
      session_id: guest.session_id,
      ip_address: guest.ip_address,
      user_agent: guest.user_agent ?? undefined,
      created_at: toISOStringSafe(guest.created_at),
      updated_at: toISOStringSafe(guest.updated_at),
    })),
  };
}
