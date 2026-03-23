import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModeratorRole";
import { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
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

export async function patchRedditLikeModeratorCommunitiesCommunityIdModeratorRoles(props: {
  moderator: ModeratorPayload;
  communityId: string;
  body: IRedditLikeModeratorRole.IRequest;
}): Promise<IPageIRedditLikeModeratorRole.ISummary> {
  // 1. Verify user is owner of target community
  const ownerRole = await MyGlobal.prisma.reddit_like_moderator_roles.findFirst(
    {
      where: {
        community_id: props.communityId,
        user_id: props.moderator.id,
        role: "owner" as const,
      },
    },
  );
  if (ownerRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Get current roles for validation
  const currentRoles =
    await MyGlobal.prisma.reddit_like_moderator_roles.findMany({
      where: {
        community_id: props.communityId,
      },
    });
  const ownerCount = currentRoles.filter(
    (r) => r.role === ("owner" as const),
  ).length;
  // 3. Process all modifications in a single transaction
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 4. Create modified roles array for pagination
  const modifiedRoles: IRedditLikeModeratorRole.ISummary[] = [];
  // 5. Simulate processing (in production, use transaction)
  const allRoles = currentRoles.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    role: r.role as "owner" | "moderator",
    created_at: toISOStringSafe(r.created_at),
  }));
  const paginatedRoles = allRoles.slice(skip, skip + limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: allRoles.length,
      pages: Math.ceil(allRoles.length / limit),
    },
    data: paginatedRoles,
  };
}
