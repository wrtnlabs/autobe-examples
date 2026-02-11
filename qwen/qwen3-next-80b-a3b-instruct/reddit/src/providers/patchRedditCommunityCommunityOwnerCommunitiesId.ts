import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { RedditCommunityCommunityOwnerAtSummaryTransformer } from "../transformers/RedditCommunityCommunityOwnerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunityOwnerCommunitiesId(props: {
  communityOwner: CommunityownerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommunity> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: props.id },
      select: {
        id: true,
        name: true,
        description: true,
        icon_url: true,
        subscriber_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        owner: RedditCommunityCommunityOwnerAtSummaryTransformer.select(),
      },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  return {
    id: community.id,
    name: community.name,
    description: community.description ?? undefined,
    icon_url: community.icon_url ?? undefined,
    subscriber_count: Number(community.subscriber_count),
    created_at: toISOStringSafe(community.created_at),
    updated_at: toISOStringSafe(community.updated_at),
    deleted_at: community.deleted_at
      ? toISOStringSafe(community.deleted_at)
      : null,
    owner: await RedditCommunityCommunityOwnerAtSummaryTransformer.transform(
      community.owner,
    ),
  };
}
