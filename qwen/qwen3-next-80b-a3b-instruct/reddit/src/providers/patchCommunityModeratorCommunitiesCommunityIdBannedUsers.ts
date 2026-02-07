import { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBannedUser";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityModeratorCommunitiesCommunityIdBannedUsers(props: {
  moderator: ModeratorPayload;
  communityId: string;
  body: ICommunityBannedUser.IRequest;
}): Promise<IPageICommunityBannedUser> {
  // Since ICommunityBannedUser.IRequest is {} (empty), all parameters are derived from URL and auth
  // Default values: 20 per page, sort by created_at DESC
  const limit = 20;
  // Cursor-based pagination: if there's a cursor from client, use it. Otherwise start from beginning.
  // Since body doesn't define cursor, we assume cursor-based pagination is initiated by client params
  // But body is empty, so we cannot use it. We'll return first page with 20 records.
  // In a real system, the request body should define nextCursor or page token. But since structure is {},
  // we assume default pagination: first page, 20 records, sort by created_at DESC, then id DESC.
  const whereInput = {
    community_id: props.communityId,
    deleted_at: null,
  } satisfies Prisma.community_bansWhereInput;
  // Fetch data with limit+1 to detect hasNext
  const data = await MyGlobal.prisma.community_bans.findMany({
    where: whereInput,
    take: limit + 1,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    select: {
      id: true,
      community_id: true,
      banned_user_id: true,
      banned_by_id: true,
      reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Extract next cursor
  const hasNext = data.length > limit;
  const finalData = hasNext ? data.slice(0, -1) : data;
  // Map to response DTO format
  const transformedData: ICommunityBannedUser[] = finalData.map((ban) => ({
    id: ban.id,
    community_id: ban.community_id,
    banned_user_id: ban.banned_user_id,
    banned_by_id: ban.banned_by_id,
    reason: ban.reason,
    created_at: toISOStringSafe(ban.created_at),
    updated_at: toISOStringSafe(ban.updated_at),
    deleted_at: ban.deleted_at ? toISOStringSafe(ban.deleted_at) : null,
  }));
  // Add computed fields to correspond to views (this is not in DTO but client wants) -
  // Corporation will augment the response in UI layer.
  // But according to DTO, these fields (display_name, avatar_url, karma_score, banned_by_display_name)
  // are NOT part of ICommunityBannedUser. Therefore, they must be returned in a separate layer.
  //
  // IMPORTANT: ICommunityBannedUser is the base DTO. The endpoint returns IPageICommunityBannedUser.
  // The client expects only fields defined in ICommunityBannedUser. Additional fields (display_name, etc.)
  // are not in the type and will cause type errors. We must not add them.
  //
  // Looking at the API specification: "Return only essential fields: id, user_id, display_name, avatar_url, reason, created_at, expires_at, banned_by_display_name, karma_score."
  // This conflicts with the DTO definition which has no display_name.
  //
  // HTML: The previously generated DTO ICommunityBannedUser does not contain display_name/firstName/other profile fields.
  // This suggests that the specification description is for a summary view, but the DTO defines the canonical record.
  //
  // Therefore, to satisfy the specification WITHOUT breaking type safety:
  // We MUST return IPageICommunityBannedUser with extended ICommunityBannedUser that includes the viewer fields.
  // But the current IPageICommunityBannedUser uses ICommunityBannedUser as-is.
  //
  // This implies a mismatch between API specification and generated DTO.
  //
  // Since this is a code-generated system (AutoBE), the requirement states:
  // "Consider this as the source of truth" for the DTO.
  //
  // We must let the DTO drive the implementation. The specification description is referring to the domain model,
  // and AutoBE is generating a DTO that is unenriched (raw database record).
  //
  // Therefore, we must NOT add external fields (display_name, avatar_url, etc.) to the return type.
  // We return only the ICommunityBannedUser fields.
  //
  // If the client wants enriched data, they should query separately.
  //
  // FINAL DECISION: Return IPageICommunityBannedUser with the exact ICommunityBannedUser records only.
  // This satisfies the type system and the generated DTO structure.
  //
  // The API specification description is misleading. We follow the code-generated DTO as absolute truth.
  // Calculate pagination metadata
  const pagination: IPage.IPagination = {
    current: 1,
    limit: limit,
    records: data.length > limit ? data.length - 1 : data.length,
    pages:
      data.length > limit
        ? Math.ceil((data.length - 1) / limit)
        : Math.ceil(data.length / limit),
  } satisfies IPage.IPagination;
  return {
    pagination: pagination,
    data: transformedData,
  };
}
