import { ICommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarmaHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityKarmaHistory";
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

export async function getCommunityAdminUsersUserIdKarma(props: {
  admin: AdminPayload;
  userId: string;
}): Promise<IPageICommunityKarmaHistory> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.community_karma_histories.findMany({
    where: {
      mem_id: props.userId,
    },
    orderBy: {
      created_at: "desc",
    },
    skip,
    take: limit,
    select: {
      id: true,
      mem_id: true,
      source_type: true,
      source_id: true,
      delta_amount: true,
      reason: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.community_karma_histories.count({
    where: {
      mem_id: props.userId,
    },
  });
  return {
    data: data.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      mem_id: item.mem_id as string & tags.Format<"uuid">,
      source_type: item.source_type,
      source_id:
        item.source_id === null
          ? null
          : (item.source_id as string & tags.Format<"uuid">),
      delta_amount: item.delta_amount,
      reason: item.reason,
      created_at: toISOStringSafe(item.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(item.updated_at) as string &
        tags.Format<"date-time">,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
