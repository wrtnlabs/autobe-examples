import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformMvCommunitySubscriberCount } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMvCommunitySubscriberCount";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformMvCommunitySubscriberCountTransformer } from "../transformers/CommunityPlatformMvCommunitySubscriberCountTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminCommunitiesCommunityIdSubscribersMetrics(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformMvCommunitySubscriberCount.IRequest;
}): Promise<ICommunityPlatformMvCommunitySubscriberCount> {
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId, deleted_at: null },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.community_platform_subscription_activitiesWhereInput =
    {
      community_id: props.communityId,
      event_time: {
        ...(props.body.startDate && { gte: new Date(props.body.startDate) }),
        ...(props.body.endDate && { lte: new Date(props.body.endDate) }),
      },
    };
  const activities =
    await MyGlobal.prisma.community_platform_subscription_activities.findMany({
      where: whereInput,
      select: {
        id: true,
        event_type: true,
        event_time: true,
        created_at: true,
      },
      orderBy: { event_time: "desc" },
      skip,
      take: limit,
    });
  const subscriberCount =
    await MyGlobal.prisma.community_platform_mv_community_subscriber_counts.findUniqueOrThrow(
      {
        where: { community_id: props.communityId },
        ...CommunityPlatformMvCommunitySubscriberCountTransformer.select(),
      },
    );
  return await CommunityPlatformMvCommunitySubscriberCountTransformer.transform(
    subscriberCount,
  );
}
