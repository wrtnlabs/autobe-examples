import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBan";
import { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityBanAtSummaryTransformer } from "../transformers/RedditCommunityBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityBan.IRequest;
}): Promise<IPageIRedditCommunityBan.ISummary> {
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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_bansWhereInput = {
    reddit_community_community_id: props.communityId,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.search !== undefined && {
      member: {
        OR: [
          { username: { contains: props.body.search, mode: "insensitive" } },
          {
            display_name: { contains: props.body.search, mode: "insensitive" },
          },
        ],
      },
    }),
  } satisfies Prisma.reddit_community_bansWhereInput;
  const data = await MyGlobal.prisma.reddit_community_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditCommunityBanAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_bans.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityBanAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCommunityBan.ISummary;
}
