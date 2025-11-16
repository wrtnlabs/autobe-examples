import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function putRedditCommunityRegisteredUserCommunitiesCommunityName(props: {
  registeredUser: RegisteredUserPayload;
  communityName: string;
  body: IRedditCommunityCommunity.IUpdate;
}): Promise<IRedditCommunityCommunity> {
  const existing =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: props.communityName },
    });

  if (!existing) {
    throw new HttpException("Community not found", 404);
  }

  if (existing.creator_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.reddit_community_communities.update({
    where: { name: props.communityName },
    data: {
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.deleted_at !== undefined && {
        deleted_at: props.body.deleted_at,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    communityName: updated.name,
    description: updated.description ?? "",
    status: updated.status as "active" | "inactive",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
    creator_id: updated.creator_id,
  };
}
