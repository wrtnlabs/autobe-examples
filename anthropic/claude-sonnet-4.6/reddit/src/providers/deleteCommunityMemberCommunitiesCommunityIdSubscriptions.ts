import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityMemberCommunitiesCommunityIdSubscriptions(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify the community exists and is not deleted
  await MyGlobal.prisma.community_communities.findFirstOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Find the active subscription
  const subscription = await MyGlobal.prisma.community_subscriptions.findFirst({
    where: {
      community_member_id: props.member.id,
      community_community_id: props.communityId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (subscription === null) {
    throw new HttpException("Not subscribed to this community", 404);
  }
  // Step 3: Soft-delete the subscription
  await MyGlobal.prisma.community_subscriptions.update({
    where: { id: subscription.id },
    data: { deleted_at: new Date() },
  });
}
