import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityTransformer } from "../transformers/RedditLikeCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeMemberCommunitiesCommunityName(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditLikeCommunity.IUpdate;
}): Promise<IRedditLikeCommunity> {
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: { name: props.communityName },
    select: { id: true, member_id: true },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  if (community.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.reddit_like_communities.update({
    where: { id: community.id },
    data: {
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.icon_url !== undefined && {
        icon_url: props.body.icon_url,
      }),
      updated_at: new Date(),
    },
    ...RedditLikeCommunityTransformer.select(),
  });
  return await RedditLikeCommunityTransformer.transform(updated);
}
