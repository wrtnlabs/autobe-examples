import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
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

export async function putRedditCommunityMemberCommunitiesCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
  body: IRedditCommunityBan.IUpdate;
}): Promise<IRedditCommunityBan> {
  const ban = await MyGlobal.prisma.reddit_community_bans.findUniqueOrThrow({
    where: { id: props.banId },
    select: {
      id: true,
      reddit_community_community_id: true,
    },
  });
  if (ban.reddit_community_community_id !== props.communityId) {
    throw new HttpException("Ban does not belong to specified community", 400);
  }
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: {
        reddit_community_community_id: props.communityId,
        reddit_community_member_id: props.member.id,
        deleted_at: null,
      },
    },
  );
  if (!moderator) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_community_bans.update({
    where: { id: props.banId },
    data: {
      ...(props.body.reason !== undefined && { reason: props.body.reason }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.reddit_community_bans.findUniqueOrThrow(
    {
      where: { id: props.banId },
      ...RedditCommunityBanTransformer.select(),
    },
  );
  return await RedditCommunityBanTransformer.transform(updated);
}
