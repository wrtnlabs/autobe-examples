import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerator";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneModeratorAtSummaryTransformer } from "../transformers/RedditCloneModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberCommunitiesCommunityNameModerators(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditCloneModerator.IRequest;
}): Promise<IPageIRedditCloneModerator.ISummary> {
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { name: props.communityName },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    community_id: community.id,
    deleted_at: null,
    ...(props.body.search && {
      member: {
        OR: [
          {
            username: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
          {
            display_name: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
        ],
      },
    }),
    ...(props.body.is_owner !== undefined && { is_owner: props.body.is_owner }),
  } satisfies Prisma.reddit_clone_moderatorsWhereInput;
  const data = await MyGlobal.prisma.reddit_clone_moderators.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditCloneModeratorAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_moderators.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneModeratorAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
