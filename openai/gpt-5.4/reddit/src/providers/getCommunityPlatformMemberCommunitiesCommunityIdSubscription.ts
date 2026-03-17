import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformSubscriptionTransformer } from "../transformers/CommunityPlatformSubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommunitiesCommunityIdSubscription(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSubscription> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (community.deleted_at !== null || community.status !== "active") {
    throw new HttpException("Not Found", 404);
  }
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findFirstOrThrow({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_community_id: props.communityId,
        active: true,
        deleted_at: null,
      },
      ...CommunityPlatformSubscriptionTransformer.select(),
    });
  return await CommunityPlatformSubscriptionTransformer.transform(subscription);
}
