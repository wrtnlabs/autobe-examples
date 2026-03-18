import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformCommunities(props: {
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const search = props.body.search;
  const whereInput = {
    deleted_at: null,
    ...(search !== undefined &&
      search !== "" && {
        name: {
          contains: search,
          mode: "insensitive" as any,
        },
      }),
  } satisfies Prisma.community_platform_communitiesWhereInput;
  const skip = (page - 1) * limit;
  const communities =
    await MyGlobal.prisma.community_platform_communities.findMany({
      where: whereInput,
      orderBy: [{ created_at: "desc" }, { id: "asc" }],
      skip,
      take: limit,
      ...CommunityPlatformCommunityAtSummaryTransformer.select(),
    });
  const records = await MyGlobal.prisma.community_platform_communities.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      communities,
      async (c) =>
        await CommunityPlatformCommunityAtSummaryTransformer.transform(c),
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}
