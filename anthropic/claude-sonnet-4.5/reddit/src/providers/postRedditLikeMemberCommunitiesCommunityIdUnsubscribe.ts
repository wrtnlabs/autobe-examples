import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditLikeMemberCommunitiesCommunityIdUnsubscribe(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, communityId } = props;

  const subscription =
    await MyGlobal.prisma.reddit_like_community_subscriptions.findFirst({
      where: {
        community_id: communityId,
        member_id: member.id,
      },
    });

  if (!subscription) {
    return;
  }

  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.reddit_like_community_subscriptions.delete({
      where: {
        id: subscription.id,
      },
    });

    await tx.reddit_like_communities.update({
      where: {
        id: communityId,
      },
      data: {
        subscriber_count: {
          decrement: 1,
        },
      },
    });
  });
}
