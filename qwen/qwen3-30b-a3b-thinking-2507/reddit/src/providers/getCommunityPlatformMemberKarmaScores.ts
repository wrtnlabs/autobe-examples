import { ICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaScore";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaScore";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformKarmaScoreAtSummaryTransformer } from "../transformers/CommunityPlatformKarmaScoreAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberKarmaScores(props: {
  member: MemberPayload;
  page?: number;
  limit?: number;
}): Promise<IPageICommunityPlatformKarmaScore.ISummary> {
  const { member } = props;
  const page = props.page ?? 1;
  const limit = props.limit ?? 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.community_platform_karma_scores.findMany({
    where: {
      community_platform_members_id: member.id,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...CommunityPlatformKarmaScoreAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_platform_karma_scores.count({
    where: {
      community_platform_members_id: member.id,
      deleted_at: null,
    },
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformKarmaScoreAtSummaryTransformer.transform,
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
