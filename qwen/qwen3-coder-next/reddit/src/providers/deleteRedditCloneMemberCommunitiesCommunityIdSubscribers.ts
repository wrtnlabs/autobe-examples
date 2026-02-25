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

export async function deleteRedditCloneMemberCommunitiesCommunityIdSubscribers(props: {
  member: MemberPayload;
  communityId: string;
}): Promise<void> {
  await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  const subscription =
    await MyGlobal.prisma.reddit_clone_content_subscriptions.findUniqueOrThrow({
      where: {
        member_id_community_id: {
          member_id: props.member.id,
          community_id: props.communityId,
        },
      },
    });
  await MyGlobal.prisma.reddit_clone_content_subscriptions.delete({
    where: { id: subscription.id },
  });
  await MyGlobal.prisma.reddit_clone_communities.update({
    where: { id: props.communityId },
    data: { subscriber_count: { decrement: 1 } },
  });
}
