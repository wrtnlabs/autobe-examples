import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditProfile";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditProfileAtSummaryTransformer } from "../transformers/RedditProfileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditProfiles(props: {
  body: IRedditProfile.IRequest;
}): Promise<IPageIRedditProfile.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_profilesWhereInput = {
    deleted_at: null,
    ...(props.body.display_name && {
      display_name: {
        contains: props.body.display_name,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.bio && {
      bio: {
        contains: props.body.bio,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.minKarma !== undefined && {
      karma: {
        gte: props.body.minKarma,
      },
    }),
    ...(props.body.maxKarma !== undefined && {
      karma: {
        lte: props.body.maxKarma,
      },
    }),
  } satisfies Prisma.reddit_profilesWhereInput;
  const orderByInput = (() => {
    switch (props.body.sort) {
      case "hot":
      case "top":
        return { karma: "desc" as const };
      case "new":
        return { created_at: "desc" as const };
      case "controversial":
        return { karma: "asc" as const };
      default:
        return { created_at: "desc" as const };
    }
  })() satisfies Prisma.reddit_profilesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_profiles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditProfileAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_profiles.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditProfileAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditProfile.ISummary;
}
