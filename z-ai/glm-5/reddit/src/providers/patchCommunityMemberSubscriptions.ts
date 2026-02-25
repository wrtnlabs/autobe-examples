import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunitySubscriptionAtSummaryTransformer } from "../transformers/CommunitySubscriptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMemberSubscriptions(props: {
  member: MemberPayload;
  body: ICommunitySubscription.IRequest;
}): Promise<IPageICommunitySubscription.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "date";
  const orderByInput = (
    sortBy === "alphabetical"
      ? { community: { name: "asc" as const } }
      : sortBy === "subscribers"
        ? { community: { subscriber_count: "desc" as const } }
        : { created_at: "desc" as const }
  ) satisfies Prisma.community_subscriptionsOrderByWithRelationInput;
  const whereInput = {
    community_member_id: props.member.id,
    community: { deleted_at: null },
  } satisfies Prisma.community_subscriptionsWhereInput;
  const data = await MyGlobal.prisma.community_subscriptions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunitySubscriptionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_subscriptions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunitySubscriptionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
