import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanOfMember";
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
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { RedditCommunityBanOfMemberAtSummaryTransformer } from "../transformers/RedditCommunityBanOfMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunityModeratorBans(props: {
  communityModerator: CommunitymoderatorPayload;
  body: IRedditCommunityBanOfMember.IRequest;
}): Promise<IPageIRedditCommunityBanOfMember.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where: Prisma.reddit_community_bansWhereInput = {
    deleted_at:
      props.body.deleted_at === null
        ? null
        : props.body.deleted_at
          ? { not: null }
          : null,
  };
  if (props.body.community_id) {
    where.community_id = props.body.community_id;
  }
  if (props.body.banned_member_id) {
    where.banned_member_id = props.body.banned_member_id;
  }
  if (props.body.banned_owner_id) {
    where.banned_owner_id = props.body.banned_owner_id;
  }
  if (props.body.banned_moderator_id) {
    where.banned_moderator_id = props.body.banned_moderator_id;
  }
  const data = await MyGlobal.prisma.reddit_community_bans.findMany({
    skip,
    take: limit,
    where,
    orderBy: { created_at: "desc" },
    ...RedditCommunityBanOfMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_bans.count({ where });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityBanOfMemberAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
