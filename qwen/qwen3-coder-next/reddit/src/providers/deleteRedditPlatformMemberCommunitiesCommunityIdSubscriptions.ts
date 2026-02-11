import { ICommon } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommon";
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

export async function deleteRedditPlatformMemberCommunitiesCommunityIdSubscriptions(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<ICommon.IMessage> {
  const subscription =
    await MyGlobal.prisma.reddit_platform_subscriptions.findFirst({
      where: {
        user_id: props.member.id,
        community_id: props.communityId,
      },
    });
  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }
  await MyGlobal.prisma.reddit_platform_subscriptions.delete({
    where: {
      id: subscription.id,
    },
  });
  return {
    message: "Successfully unsubscribed from the community",
  };
}
