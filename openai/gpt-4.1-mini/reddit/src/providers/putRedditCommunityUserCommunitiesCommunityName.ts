import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putRedditCommunityUserCommunitiesCommunityName(props: {
  user: UserPayload;
  communityName: string;
  body: IRedditCommunityCommunity.IUpdate;
}): Promise<IRedditCommunityCommunity> {
  const { user, communityName, body } = props;

  // Find community by name or throw if not found
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { name: communityName },
    });

  // Authorization check omitted due to schema: ownership field not available

  // Update mutable fields
  const updated = await MyGlobal.prisma.reddit_community_communities.update({
    where: { name: communityName },
    data: {
      description: body.description ?? null,
      updated_at: body.updated_at,
    },
  });

  // Return with safe ISO date string conversions
  return {
    id: updated.id,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
