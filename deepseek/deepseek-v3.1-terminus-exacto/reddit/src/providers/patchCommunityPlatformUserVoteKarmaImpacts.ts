import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteKarmaImpact";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteKarmaImpact";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformVoteKarmaImpactAtSummaryTransformer } from "../transformers/CommunityPlatformVoteKarmaImpactAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserVoteKarmaImpacts(props: {
  user: UserPayload;
  body: ICommunityPlatformVoteKarmaImpact.IRequest;
}): Promise<IPageICommunityPlatformVoteKarmaImpact.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause based on request filters
  const whereInput = {
    user_id: props.user.id,
    ...(props.body.start_time &&
      props.body.end_time && {
        created_at: {
          gte: new Date(props.body.start_time),
          lte: new Date(props.body.end_time),
        },
      }),
  } satisfies Prisma.community_platform_vote_karma_impactsWhereInput;
  // Query karma impacts with pagination
  const data =
    await MyGlobal.prisma.community_platform_vote_karma_impacts.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformVoteKarmaImpactAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.community_platform_vote_karma_impacts.count({
      where: whereInput,
    });
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformVoteKarmaImpactAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
