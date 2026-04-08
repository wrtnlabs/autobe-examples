import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerator";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityModeratorAtSummaryTransformer } from "../transformers/RedditCommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberCommunitiesCommunityIdModerators(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityModerator.IRequest;
}): Promise<IPageIRedditCommunityModerator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const assignedAtFilters: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (
    props.body.assignedAtFrom !== null &&
    props.body.assignedAtFrom !== undefined
  ) {
    assignedAtFilters.gte = new Date(props.body.assignedAtFrom);
  }
  if (
    props.body.assignedAtTo !== null &&
    props.body.assignedAtTo !== undefined
  ) {
    assignedAtFilters.lte = new Date(props.body.assignedAtTo);
  }
  const whereInput: Prisma.reddit_community_moderatorsWhereInput = {
    reddit_community_community_id: props.communityId,
    deleted_at: null,
    ...(props.body.role !== null &&
      props.body.role !== undefined && {
        role: props.body.role,
      }),
    ...(Object.keys(assignedAtFilters).length > 0 && {
      assigned_at: assignedAtFilters,
    }),
  } satisfies Prisma.reddit_community_moderatorsWhereInput;
  const data = await MyGlobal.prisma.reddit_community_moderators.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { assigned_at: "desc" },
    ...RedditCommunityModeratorAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_moderators.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityModeratorAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCommunityModerator.ISummary;
}
