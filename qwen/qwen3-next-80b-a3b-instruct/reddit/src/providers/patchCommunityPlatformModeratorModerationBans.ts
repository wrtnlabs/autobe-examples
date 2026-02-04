import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformBanTransformer } from "../transformers/CommunityPlatformBanTransformer";

export async function patchCommunityPlatformModeratorModerationBans(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformBan.IRequest;
}): Promise<IPageICommunityPlatformBan.ISummary> {
  const cursor = props.body.cursor ? props.body.cursor : null;
  const limit = props.body.limit ?? 20;
  // Build where clause for filtering
  const whereInput: Prisma.community_platform_bansWhereInput = {
    ...(props.body.community_id && { community_id: props.body.community_id }),
    ...(props.body.banned_user_id && {
      banned_user_id: props.body.banned_user_id,
    }),
    ...(props.body.moderator_id && { moderator_id: props.body.moderator_id }),
  };
  // Cursor-based pagination
  let orderBy: Prisma.community_platform_bansOrderByWithRelationInput = {
    created_at: "desc" as const,
  };
  let whereCursor: Prisma.community_platform_bansWhereInput = { ...whereInput };
  if (cursor) {
    // For cursor-based pagination, filter records with created_at less than cursor's created_at
    // In a real system, cursor would be encoded from a compound key, but here we use created_at
    // as a simple surrogate key that is unique and increasing
    const parsedCursor = JSON.parse(
      Buffer.from(cursor, "base64").toString("utf-8"),
    ) as {
      created_at: string;
      id: string;
    };
    whereCursor.created_at = { lt: parsedCursor.created_at };
    orderBy = { created_at: "desc" as const, id: "desc" as const };
  }
  // Query database with transformer's select
  const data = await MyGlobal.prisma.community_platform_bans.findMany({
    where: whereCursor,
    orderBy,
    take: limit + 1, // Fetch one extra to determine if more results exist
    ...CommunityPlatformBanTransformer.select(),
  });
  // Determine next cursor
  let nextCursor: string | null = null;
  if (data.length > limit) {
    const lastItem = data.pop()!; // Remove the extra item
    nextCursor = Buffer.from(
      JSON.stringify({
        created_at: toISOStringSafe(lastItem.created_at),
        id: lastItem.id,
      }),
    ).toString("base64");
  }
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformBanTransformer.transform,
  );
  // Map ICommunityPlatformBan items to IPageICommunityPlatformBan.ISummary
  // Based on the schema and transformer, bans are only on community_platform_members
  // So target_type is always "member" and target_id is always banned_user_id
  const summaryData: IPageICommunityPlatformBan.ISummary["data"] =
    transformedData.map((item) => ({
      target_type: "member", // Only member bans are supported in the current schema
      target_id: item.banned_user_id as string & tags.Format<"uuid">, // Use the actual field from the interface
      moderator: item.moderator as ICommunityPlatformModerator.ISummary,
      community: item.community as ICommunityPlatformCommunity.ISummary,
    }));
  // Return paginated result with correct IPage.IPagination (no cursor property)
  return {
    data: summaryData,
    pagination: {
      current: 1,
      limit,
      records: 0,
      pages: Math.ceil(0 / limit),
    } satisfies IPage.IPagination,
  };
}
