import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserProfile";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityUserProfileAtSummaryTransformer } from "../transformers/RedditCommunityUserProfileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMembers(props: {
  body: IRedditCommunityUserProfile.IRequest;
}): Promise<IPageIRedditCommunityUserProfile.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_user_profilesWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { member: { username: { contains: props.body.search } } },
        { display_name: { contains: props.body.search } },
      ],
    }),
    ...(props.body.karmaMin !== undefined && {
      karma_score: { gte: props.body.karmaMin },
    }),
    ...(props.body.karmaMax !== undefined && {
      karma_score: { lte: props.body.karmaMax },
    }),
  } satisfies Prisma.reddit_community_user_profilesWhereInput;
  const sortField = props.body.sort ?? "karma_score";
  const orderByInput: Prisma.reddit_community_user_profilesOrderByWithRelationInput =
    sortField === "username"
      ? { member: { username: "asc" } }
      : sortField === "display_name"
        ? { display_name: "asc" }
        : sortField === "created_at"
          ? { created_at: "desc" }
          : { karma_score: "desc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_user_profiles.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCommunityUserProfileAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_user_profiles.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityUserProfileAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCommunityUserProfile.ISummary;
}
