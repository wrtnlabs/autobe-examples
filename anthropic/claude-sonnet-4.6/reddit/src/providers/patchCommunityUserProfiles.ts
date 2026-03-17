import { ICommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityUserProfileAtSummaryTransformer } from "../transformers/CommunityUserProfileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityUserProfiles(props: {
  body: ICommunityUserProfile.IRequest;
}): Promise<IPageICommunityUserProfile.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    member: {
      deleted_at: null,
    },
    ...(props.body.search !== undefined &&
      props.body.search !== null && {
        OR: [
          {
            display_name: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
          {
            member: {
              deleted_at: null,
              username: {
                contains: props.body.search,
                mode: "insensitive" as const,
              },
            },
          },
        ],
      }),
  } satisfies Prisma.community_user_profilesWhereInput;
  const orderByInput = (
    props.body.sort === "karma_score_asc"
      ? { karma_score: "asc" as const }
      : props.body.sort === "display_name_asc"
        ? { display_name: "asc" as const }
        : props.body.sort === "created_at_desc"
          ? { created_at: "desc" as const }
          : { karma_score: "desc" as const }
  ) satisfies Prisma.community_user_profilesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.community_user_profiles.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...CommunityUserProfileAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_user_profiles.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityUserProfileAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
