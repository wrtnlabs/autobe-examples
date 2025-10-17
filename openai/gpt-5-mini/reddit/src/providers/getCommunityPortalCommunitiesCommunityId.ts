import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";

export async function getCommunityPortalCommunitiesCommunityId(props: {
  communityId: string & tags.Format<"uuid">;
}): Promise<ICommunityPortalCommunity> {
  const { communityId } = props;

  try {
    const community =
      await MyGlobal.prisma.community_portal_communities.findUnique({
        where: { id: communityId },
        select: {
          id: true,
          creator_user_id: true,
          name: true,
          slug: true,
          description: true,
          is_private: true,
          visibility: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });

    if (!community) {
      throw new HttpException("Not Found", 404);
    }

    if (community.deleted_at !== null) {
      throw new HttpException("Not Found", 404);
    }

    if (community.is_private) {
      throw new HttpException("Unauthorized", 401);
    }

    return {
      id: community.id,
      creator_user_id: community.creator_user_id ?? null,
      name: community.name,
      slug: community.slug,
      description: community.description ?? null,
      is_private: community.is_private,
      visibility: community.visibility,
      created_at: toISOStringSafe(community.created_at),
      updated_at: toISOStringSafe(community.updated_at),
      deleted_at: null,
    };
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
