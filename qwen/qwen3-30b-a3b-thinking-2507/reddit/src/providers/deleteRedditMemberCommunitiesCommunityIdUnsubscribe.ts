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

export async function deleteRedditMemberCommunitiesCommunityIdUnsubscribe(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check community exists
  await MyGlobal.prisma.reddit_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Check subscription exists
  const subscription =
    await MyGlobal.prisma.reddit_community_subscriptions.findFirst({
      where: {
        member_id: props.member.id,
        community_id: props.communityId,
      },
    });
  if (!subscription) {
    throw new HttpException("User is not subscribed to this community", 400);
  }
  // Delete subscription using id
  await MyGlobal.prisma.reddit_community_subscriptions.delete({
    where: {
      id: subscription.id,
    },
  });
}
