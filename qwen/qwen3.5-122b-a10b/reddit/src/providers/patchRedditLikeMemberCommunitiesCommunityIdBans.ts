import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityBan";
import { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityBanAtSummaryTransformer } from "../transformers/RedditLikeCommunityBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberCommunitiesCommunityIdBans(props: {
  member: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "member";
  };
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunityBan.IRequest;
}): Promise<IPageIRedditLikeCommunityBan.ISummary> {
  const community =
    await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
      },
    });
  const isOwner = community.owner_id === props.member.id;
  if (!isOwner) {
    const isModerator =
      await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
        where: {
          reddit_like_community_id: props.communityId,
          reddit_like_member_id: props.member.id,
          deleted_at: null,
        },
      });
    if (isModerator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const whereInput: Prisma.reddit_like_community_bansWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
    ...(props.body.member_id !== undefined && {
      member_id: props.body.member_id,
    }),
    ...(props.body.created_at_start !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_start),
      },
    }),
    ...(props.body.created_at_end !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_end),
      },
    }),
  } satisfies Prisma.reddit_like_community_bansWhereInput;
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const records = await MyGlobal.prisma.reddit_like_community_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditLikeCommunityBanAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_community_bans.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    records,
    RedditLikeCommunityBanAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIRedditLikeCommunityBan.ISummary;
}
