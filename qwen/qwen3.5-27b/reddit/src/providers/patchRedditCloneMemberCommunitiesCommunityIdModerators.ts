import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityModerator";
import { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityModeratorAtSummaryTransformer } from "../transformers/RedditCloneCommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberCommunitiesCommunityIdModerators(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunityModerator.IRequest;
}): Promise<IPageIRedditCloneCommunityModerator.ISummary> {
  // Verify user is a moderator of the community
  const moderatorRecord =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_communities_id: props.communityId,
        reddit_clone_members_id: props.member.id,
        deleted_at: null,
      },
    });
  if (moderatorRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause
  const whereInput: Prisma.reddit_clone_community_moderatorsWhereInput = {
    reddit_clone_communities_id: props.communityId,
    deleted_at: null,
    ...(props.body.role !== undefined && { role: props.body.role }),
    ...(props.body.search !== undefined && {
      member: {
        OR: [
          { username: { mode: "insensitive", contains: props.body.search } },
          {
            display_name: { mode: "insensitive", contains: props.body.search },
          },
        ],
      },
    }),
  };
  // Build orderBy clause
  const orderByInput: Prisma.reddit_clone_community_moderatorsOrderByWithRelationInput =
    props.body.sort === "username"
      ? { member: { username: props.body.order ?? "desc" } }
      : props.body.sort === "role"
        ? { role: props.body.order ?? "desc" }
        : { created_at: props.body.order ?? "desc" };
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_clone_community_moderators.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCloneCommunityModeratorAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_clone_community_moderators.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneCommunityModeratorAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
