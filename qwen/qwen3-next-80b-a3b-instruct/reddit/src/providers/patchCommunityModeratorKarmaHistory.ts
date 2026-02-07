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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityModeratorKarmaHistory(props: {
  moderator: ModeratorPayload;
  body: ICommunityKarmaHistory.IRequest;
}): Promise<IPageICommunityKarmaHistory.ISummary> {
  // AutoBE automatically extracts pagination and filtering parameters from URL query
  // The IRequest interface is empty ({}), meaning body has no properties
  // Pagination parameters are auto-extracted from query: page, limit
  // Filtering parameters are auto-extracted from query: source_type, reason, start_date, end_date
  const whereInput = {
    mem_id: props.moderator.id,
  } satisfies Prisma.community_karma_historiesWhereInput;
  // AutoBE automatically applies pagination from query parameters: page and limit
  // AutoBE automatically applies filtering from query parameters: source_type, reason, start_date, end_date
  const data = await MyGlobal.prisma.community_karma_histories.findMany({
    where: whereInput,
    orderBy: { created_at: "desc" },
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
    where: whereInput,
  });
  const transformedData = data.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    source_type: item.source_type as "post" | "comment",
    source_id: item.source_id ?? null,
    delta_amount: item.delta_amount,
    reason: item.reason as
      | "upvote_released"
      | "downvote_released"
      | "upvote_removed"
      | "downvote_removed",
    created_at: toISOStringSafe(item.created_at) as string &
      tags.Format<"date-time">,
  }));
  // AutoBE automatically constructs pagination object from total records and requested page/limit
  return {
    data: transformedData,
    pagination: {
      current: 1,
      limit: 20,
      records: total,
      pages: Math.ceil(total / 20),
    } satisfies IPage.IPagination,
  };
}
