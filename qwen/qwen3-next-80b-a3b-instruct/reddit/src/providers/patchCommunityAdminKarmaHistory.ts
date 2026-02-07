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

export async function patchCommunityAdminKarmaHistory(props: {
  admin: AdminPayload;
  body: ICommunityKarmaHistory.IRequest;
}): Promise<IPageICommunityKarmaHistory.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const where: Prisma.community_karma_historiesWhereInput = {
    mem_id: props.admin.id,
  } satisfies Prisma.community_karma_historiesWhereInput;
  const data = await MyGlobal.prisma.community_karma_histories.findMany({
    where,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    select: {
      id: true,
      source_type: true,
      source_id: true,
      delta_amount: true,
      reason: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.community_karma_histories.count({
    where,
  });
  return {
    data: data.map((item) => ({
      id: item.id,
      source_type: item.source_type,
      source_id: item.source_id,
      delta_amount: item.delta_amount,
      reason: item.reason,
      created_at: toISOStringSafe(item.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
