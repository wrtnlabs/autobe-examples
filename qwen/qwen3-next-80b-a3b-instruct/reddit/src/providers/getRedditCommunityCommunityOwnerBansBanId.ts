import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanOfMember";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { RedditCommunityBanOfMemberTransformer } from "../transformers/RedditCommunityBanOfMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityCommunityOwnerBansBanId(props: {
  communityOwner: CommunityownerPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityBanOfMember> {
  const ban = await MyGlobal.prisma.reddit_community_bans.findUnique({
    where: { id: props.banId },
    ...RedditCommunityBanOfMemberTransformer.select(),
  });
  if (!ban) {
    throw new HttpException("Ban not found", 404);
  }
  return await RedditCommunityBanOfMemberTransformer.transform(ban);
}
