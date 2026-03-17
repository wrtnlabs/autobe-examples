import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunitySubscriptionTransformer } from "../transformers/CommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberCommunitiesCommunityIdSubscriptions(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<ICommunitySubscription> {
  // Step 1: Validate community exists
  await MyGlobal.prisma.community_communities.findUniqueOrThrow({
    where: { id: props.communityId },
    select: { id: true },
  });
  // Step 2: Check for existing subscription record
  const existing = await MyGlobal.prisma.community_subscriptions.findFirst({
    where: {
      community_member_id: props.member.id,
      community_community_id: props.communityId,
    },
    select: { id: true, deleted_at: true },
  });
  let subscriptionId: string;
  if (existing !== null) {
    if (existing.deleted_at === null) {
      // Already actively subscribed → 409 Conflict
      throw new HttpException("Already subscribed", 409);
    }
    // Reactivate previously cancelled subscription
    await MyGlobal.prisma.community_subscriptions.update({
      where: { id: existing.id },
      data: {
        deleted_at: null,
        created_at: new Date(),
      },
    });
    subscriptionId = existing.id;
  } else {
    // Create new subscription
    const created = await MyGlobal.prisma.community_subscriptions.create({
      data: {
        id: v4(),
        member: { connect: { id: props.member.id } },
        community: { connect: { id: props.communityId } },
        created_at: new Date(),
        deleted_at: null,
      },
      select: { id: true },
    });
    subscriptionId = created.id;
  }
  // Step 3: Fetch full subscription record with all relations for response
  const record =
    await MyGlobal.prisma.community_subscriptions.findUniqueOrThrow({
      where: { id: subscriptionId },
      ...CommunitySubscriptionTransformer.select(),
    });
  return CommunitySubscriptionTransformer.transform(record);
}
