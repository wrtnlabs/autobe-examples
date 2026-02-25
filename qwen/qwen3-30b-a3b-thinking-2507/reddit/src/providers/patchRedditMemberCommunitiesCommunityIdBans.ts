import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBan";
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
import { RedditCommunityBanAtSummaryTransformer } from "../transformers/RedditCommunityBanAtSummaryTransformer";
import { RedditCommunityTransformer } from "../transformers/RedditCommunityTransformer";
import { RedditProfileAtSummaryTransformer } from "../transformers/RedditProfileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityBan.IRequest;
}): Promise<IPageIRedditCommunityBan.ISummary> {
  // Validate community exists and is owned by the member
  const community = await MyGlobal.prisma.reddit_communities.findUnique({
    where: { id: props.communityId },
    include: { owner: true },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  if (community.owner.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.reddit_community_bansWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
  };
  if (props.body.username) {
    where.user = {
      display_name: { contains: props.body.username, mode: "insensitive" },
    };
    if (props.body.reason) {
      where.reason = {
        contains: props.body.reason,
        mode: "insensitive",
      };
      if (props.body.startDate || props.body.endDate) {
        const startDate = props.body.startDate
          ? toISOStringSafe(props.body.startDate)
          : undefined;
        const endDate = props.body.endDate
          ? toISOStringSafe(props.body.endDate)
          : undefined;
        where.created_at = {
          gte: startDate,
          lte: endDate,
        };
        const [bans, total] = await Promise.all([
          MyGlobal.prisma.reddit_community_bans.findMany({
            where,
            skip,
            take: limit,
            orderBy: {
              created_at: props.body.sort === "asc" ? "asc" : "desc",
            },
            include: {
              user: RedditProfileAtSummaryTransformer.select(),
              community: RedditCommunityTransformer.select(),
            },
          }),
          MyGlobal.prisma.reddit_community_bans.count({ where }),
        ]);
        const transformedBans = await ArrayUtil.asyncMap(bans, (ban) =>
          RedditCommunityBanAtSummaryTransformer.transform(ban),
        );
        return {
          data: transformedBans,
          pagination: {
            current: page,
            limit,
            records: total,
            pages: Math.ceil(total / limit),
          },
        };
      }
    }
  }
}
