import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityBanTransformer } from "../transformers/RedditCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditMemberCommunitiesCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
  body: IRedditCommunityBan.IUpdate;
}): Promise<IRedditCommunityBan> {
  const community = await MyGlobal.prisma.reddit_communities.findUniqueOrThrow({
    where: { id: props.communityId },
    select: { reddit_member_id: true },
  });
  const ban = await MyGlobal.prisma.reddit_community_bans.findUniqueOrThrow({
    where: { id: props.banId },
    include: { community: true },
  });
  if (ban.community_id !== props.communityId) {
    throw new HttpException("Ban does not belong to this community", 400);
  }
  if (community.reddit_member_id !== props.member.id) {
    throw new HttpException("User is not a moderator of this community", 403);
  }
  await MyGlobal.prisma.reddit_community_bans.update({
    where: { id: props.banId },
    data: {
      reason: props.body.reason,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const updatedBan =
    await MyGlobal.prisma.reddit_community_bans.findUniqueOrThrow({
      where: { id: props.banId },
      ...RedditCommunityBanTransformer.select(),
    });
  return await RedditCommunityBanTransformer.transform(updatedBan);
}
