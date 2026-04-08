import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneUserProfile";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneUserProfileAtSummaryTransformer } from "../transformers/RedditCloneUserProfileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneProfiles(props: {
  body: IRedditCloneUserProfile.IRequest;
}): Promise<IPageIRedditCloneUserProfile.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        display_name: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      }),
    ...(props.body.karmaMin !== undefined && {
      karma: {
        gte: props.body.karmaMin,
      },
    }),
    ...(props.body.karmaMax !== undefined && {
      karma: {
        lte: props.body.karmaMax,
      },
    }),
  } satisfies Prisma.reddit_clone_user_profilesWhereInput;
  const orderByInput = (
    props.body.sortBy === "createdAt"
      ? { created_at: "desc" as const }
      : { karma: "desc" as const }
  ) satisfies Prisma.reddit_clone_user_profilesOrderByWithRelationInput;
  const records = await MyGlobal.prisma.reddit_clone_user_profiles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCloneUserProfileAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_user_profiles.count({
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
      records,
      RedditCloneUserProfileAtSummaryTransformer.transform,
    ),
  };
}
