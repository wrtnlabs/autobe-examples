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

export async function patchCommunityAdminUsersUserIdKarmaHistory(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityKarmaHistory.IRequest;
}): Promise<IPageICommunityKarmaHistory.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Validate that userId corresponds to an active user
  const user = await MyGlobal.prisma.community_members.findUnique({
    where: { id: props.userId, deleted_at: null },
  });
  if (!user) {
    throw new HttpException("User not found or deleted", 404);
  }
  // Build filter conditions - only mem_id since no other filters exist in IRequest
  const whereConditions: Prisma.community_karma_historiesWhereInput = {
    mem_id: props.userId,
  };
  // Query karma histories
  const histories = await MyGlobal.prisma.community_karma_histories.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  // Count total matching records
  const total = await MyGlobal.prisma.community_karma_histories.count({
    where: whereConditions,
  });
  // Transform data to response format - manual mapping from database schema
  const data: ICommunityKarmaHistory.ISummary[] = histories.map((history) => ({
    id: history.id as string & tags.Format<"uuid">,
    mem_id: history.mem_id as string & tags.Format<"uuid">,
    source_type: history.source_type,
    source_id: history.source_id as (string & tags.Format<"uuid">) | null,
    delta_amount: history.delta_amount,
    reason: history.reason,
    created_at: toISOStringSafe(history.created_at),
    updated_at: toISOStringSafe(history.updated_at),
  }));
  // Return paginated response
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
} /*
 * HISTORICAL ERROR PREVENTION
 *
 * NEVER ASK FOR: ICommunityKarmaHistory.ISummary transformer - doesn't exist
 * NEVER USE: any properties from IRequest (it's empty {}
 * NEVER USE: artificial limits beyond 100 - spec says limit=100
 * NEVER USE: runtime type validation - framework does this with JSON Schema
 * NEVER USE: include - must use select for Prisma
 */
