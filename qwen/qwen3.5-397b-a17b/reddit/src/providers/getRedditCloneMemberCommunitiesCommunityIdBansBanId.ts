import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneBanTransformer } from "../transformers/RedditCloneBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneMemberCommunitiesCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneBan> {
  const moderator = await MyGlobal.prisma.reddit_clone_moderators.findFirst({
    where: {
      member_id: props.member.id,
      community_id: props.communityId,
      deleted_at: null,
    },
  });
  if (!moderator) {
    throw new HttpException("Forbidden", 403);
  }
  const ban = await MyGlobal.prisma.reddit_clone_bans.findUniqueOrThrow({
    where: { id: props.banId },
    select: {
      ...RedditCloneBanTransformer.select().select,
    },
  });
  if (ban.community.id !== props.communityId) {
    throw new HttpException("Not Found", 404);
  }
  return await RedditCloneBanTransformer.transform(ban);
}
