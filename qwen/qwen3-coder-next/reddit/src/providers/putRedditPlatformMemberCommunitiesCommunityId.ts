import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityTransformer } from "../transformers/RedditPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditPlatformMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string;
  body: IRedditPlatformCommunity.IUpdate;
}): Promise<IRedditPlatformCommunity> {
  const existing = await MyGlobal.prisma.reddit_platform_communities.findFirst({
    where: {
      id: props.communityId,
      owner_id: props.member.id,
      deleted_at: null,
    },
  });
  if (existing === null) {
    throw new HttpException("Community not found or access denied", 404);
  }
  const data: Prisma.reddit_platform_communitiesUpdateInput = {
    name: props.body.name ?? undefined,
    description: props.body.description ?? undefined,
    icon_url: props.body.iconUrl ?? undefined,
    updated_at: toISOStringSafe(new Date()),
  };
  const updated = await MyGlobal.prisma.reddit_platform_communities.update({
    where: { id: props.communityId },
    data: data,
    ...RedditPlatformCommunityTransformer.select(),
  });
  return await RedditPlatformCommunityTransformer.transform(updated);
}
