import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function deleteRedditCommunityRegisteredUserRedditCommunitySubscriptionsId(props: {
  registeredUser: RegisteredUserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const subscription =
    await MyGlobal.prisma.reddit_community_subscriptions.findUnique({
      where: { id: props.id },
    });

  if (subscription === null) {
    throw new HttpException("Subscription not found", 404);
  }

  if (
    subscription.reddit_community_registered_user_id !== props.registeredUser.id
  ) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.reddit_community_subscriptions.delete({
    where: { id: props.id },
  });
}
