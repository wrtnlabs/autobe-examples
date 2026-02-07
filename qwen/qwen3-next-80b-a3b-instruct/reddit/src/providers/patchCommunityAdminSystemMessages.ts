import { ICommunitySystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunitySystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunitySystemMessage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityAdminSystemMessages(props: {
  admin: AdminPayload;
}): Promise<IPageICommunitySystemMessage.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const now = toISOStringSafe(new Date());
  // Filter conditions from specification:
  // - status (default: 'published')
  // - published_at <= now()
  // - visible_until IS NULL OR visible_until > now()
  const where: Prisma.community_system_messagesWhereInput = {
    published_at: {
      lte: now,
    },
    OR: [{ visible_until: null }, { visible_until: { gt: now } }],
    status: "published",
  };
  // Get data
  const data = await MyGlobal.prisma.community_system_messages.findMany({
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      published_at: true,
      visible_until: true,
    },
  });
  // Count total
  const total = await MyGlobal.prisma.community_system_messages.count({
    where,
  });
  // Transform dates to string & tags.Format<'date-time'>
  const transformedData = data.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    published_at: toISOStringSafe(item.published_at),
    visible_until: item.visible_until
      ? toISOStringSafe(item.visible_until)
      : null,
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
