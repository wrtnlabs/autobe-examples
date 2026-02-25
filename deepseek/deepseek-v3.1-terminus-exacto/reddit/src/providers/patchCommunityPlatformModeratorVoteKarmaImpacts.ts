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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformVoteKarmaImpactAtSummaryTransformer } from "../transformers/CommunityPlatformVoteKarmaImpactAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorVoteKarmaImpacts(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformVoteKarmaImpact.IRequest;
}): Promise<IPageICommunityPlatformVoteKarmaImpact.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper date handling
  const whereInput: Prisma.community_platform_vote_karma_impactsWhereInput = {
    AND: [
      ...(props.body.start_time
        ? [{ created_at: { gte: props.body.start_time } }]
        : []),
      ...(props.body.end_time
        ? [{ created_at: { lte: props.body.end_time } }]
        : []),
    ],
  };
  // Get paginated data
  const data =
    await MyGlobal.prisma.community_platform_vote_karma_impacts.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformVoteKarmaImpactAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.community_platform_vote_karma_impacts.count({
      where: whereInput,
    });
  // Transform data
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
