import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityModeratorCollector } from "../collectors/CommunityPlatformCommunityModeratorCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminCommunityModerators(props: {
  admin: AdminPayload;
  body: ICommunityPlatformCommunityModerator.ICreate;
}): Promise<ICommunityPlatformCommunityModerator> {
  const bodyAny = props.body as any;
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: bodyAny.community_id },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  const communityModerator =
    await MyGlobal.prisma.community_platform_moderators.findUnique({
      where: { id: bodyAny.community_moderator_id },
    });
  if (!communityModerator) {
    throw new HttpException("Community moderator not found", 404);
  }
  const createInput =
    await CommunityPlatformCommunityModeratorCollector.collect({
      body: props.body,
      role: bodyAny.role,
      community,
      communityModerator,
    });
  try {
    const created =
      await MyGlobal.prisma.community_platform_community_moderators.create({
        data: createInput,
      });
    return {
      id: created.id,
      community_id: created.community_id,
      community_moderator_id: created.community_moderator_id,
      role: created.role,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "Duplicate moderator assignment or owner role",
        409,
      );
    }
    throw error;
  }
}
