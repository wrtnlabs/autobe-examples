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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeAdminCommunitiesCommunityIdModeratorRoles(props: {
  admin: AdminPayload;
  communityId: string;
  body: IRedditLikeModeratorRole.IRequest;
}): Promise<IPageIRedditLikeModeratorRole.ISummary> {
  // Verify admin is owner of target community
  const adminOwnership =
    await MyGlobal.prisma.reddit_like_moderator_roles.findFirst({
      where: { community_id: props.communityId, role: "owner" },
    });
  if (!adminOwnership) {
    throw new HttpException("Admin must be community owner", 403);
  }
  // Query all existing moderator roles for this community
  const existingRoles =
    await MyGlobal.prisma.reddit_like_moderator_roles.findMany({
      where: { community_id: props.communityId },
      select: { id: true, user_id: true, role: true },
    });
  // Validate owner protection
  const owners = existingRoles.filter((r) => r.role === "owner");
  if (owners.length === 0) {
    throw new HttpException("Community must have at least one owner", 400);
  }
  // Process each modification in a single transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    for (const mod of (props.body as any).modifications ?? []) {
      switch (mod.action) {
        case "ADD": {
          const existing = existingRoles.find((r) => r.user_id === mod.user_id);
          if (existing) {
            throw new HttpException(
              `User already has role ${existing.role}`,
              400,
            );
          }
          await tx.reddit_like_moderator_roles.create({
            data: {
              id: v4(),
              user_id: mod.user_id,
              community_id: props.communityId,
              role: mod.role,
              created_at: new Date(),
            },
          });
          break;
        }
        case "UPDATE": {
          const existing = existingRoles.find((r) => r.user_id === mod.user_id);
          if (!existing) {
            throw new HttpException(`User has no existing role`, 400);
          }
          if (existing.role === "owner" && mod.role === "moderator") {
            if (owners.length <= 1) {
              throw new HttpException("Cannot demote last owner", 400);
            }
          }
          await tx.reddit_like_moderator_roles.update({
            where: { id: existing.id },
            data: { role: mod.role },
          });
          break;
        }
        case "REMOVE": {
          const existing = existingRoles.find((r) => r.user_id === mod.user_id);
          if (!existing) {
            throw new HttpException(`User has no role to remove`, 400);
          }
          if (existing.role === "owner") {
            throw new HttpException("Cannot remove owner role", 400);
          }
          await tx.reddit_like_moderator_roles.delete({
            where: { id: existing.id },
          });
          break;
        }
      }
    }
  });
  // Refresh roles and return paginated list
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const updatedRoles =
    await MyGlobal.prisma.reddit_like_moderator_roles.findMany({
      where: { community_id: props.communityId },
      skip,
      take: limit,
      orderBy: { created_at: "asc" },
    });
  const total = await MyGlobal.prisma.reddit_like_moderator_roles.count({
    where: { community_id: props.communityId },
  });
  return {
    data: updatedRoles.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      role: r.role as "owner" | "moderator",
      created_at: toISOStringSafe(r.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
