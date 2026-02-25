import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerationLog";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityModerationLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityModerationLogAtSummaryTransformer } from "../transformers/CommunityModerationLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMemberCommunitiesCommunityNameModerationLogs(props: {
  member: MemberPayload;
  communityName: string;
  body: ICommunityModerationLog.IRequest;
}): Promise<IPageICommunityModerationLog.ISummary> {
  // 1. Find community by name
  const community = await MyGlobal.prisma.community_communities.findFirst({
    where: {
      name: props.communityName,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Check authorization - member must be owner or moderator
  const moderatorRecord = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: community.id,
      member_id: props.member.id,
    },
    select: { id: true },
  });
  if (!moderatorRecord) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Build pagination and filter parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 4. Build where clause with optional filters
  const whereInput = {
    community_id: community.id,
    ...(props.body.actionTypes &&
      props.body.actionTypes.length > 0 && {
        action_type: { in: props.body.actionTypes },
      }),
    ...(props.body.actorId && { actor_id: props.body.actorId }),
    ...(props.body.from && {
      created_at: { gte: new Date(props.body.from) },
    }),
    ...(props.body.to && {
      created_at: { lte: new Date(props.body.to) },
    }),
  } satisfies Prisma.community_moderation_logsWhereInput;
  // 5. Execute queries with transformer select
  const logs = await MyGlobal.prisma.community_moderation_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...CommunityModerationLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_moderation_logs.count({
    where: whereInput,
  });
  // 6. Transform and return paginated response
  const data = await ArrayUtil.asyncMap(
    logs,
    CommunityModerationLogAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
