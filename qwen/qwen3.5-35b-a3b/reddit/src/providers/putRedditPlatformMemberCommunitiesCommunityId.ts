import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
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
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunity.IUpdate;
}): Promise<IRedditPlatformCommunity> {
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });
  if (community.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updateData: {
    description: string | null;
    icon_url: string | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    description: props.body.description ?? null,
    icon_url: props.body.icon_url ?? null,
    updated_at: toISOStringSafe(new Date()),
  };
  await MyGlobal.prisma.reddit_platform_communities.update({
    where: { id: props.communityId },
    data: {
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.icon_url !== undefined && {
        icon_url: props.body.icon_url,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      ...RedditPlatformCommunityTransformer.select(),
    });
  return await RedditPlatformCommunityTransformer.transform(updated);
}
