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

export async function deleteRedditCloneMemberSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const subscription =
    await MyGlobal.prisma.reddit_clone_subscriptions.findUniqueOrThrow({
      where: {
        id: props.subscriptionId,
        deleted_at: null,
      },
      select: {
        id: true,
        member_id: true,
      },
    });
  if (subscription.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_clone_subscriptions.update({
    where: { id: props.subscriptionId },
    data: {
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
}
