import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunitySubscriptionCollector } from "../collectors/CommunityPlatformCommunitySubscriptionCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformCommunitySubscriptionTransformer } from "../transformers/CommunityPlatformCommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserSubscriptions(props: {
  user: UserPayload;
  body: ICommunityPlatformCommunitySubscription.ICreate;
}): Promise<ICommunityPlatformCommunitySubscription> {
  const userEntity =
    await MyGlobal.prisma.community_platform_users.findUniqueOrThrow({
      where: { id: props.user.id, deleted_at: null },
    });
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { name: props.body.communityCode },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  const existingSubscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findFirst({
      where: {
        community_id: community.id,
        user_id: props.user.id,
        deleted_at: null,
      },
    });
  if (existingSubscription) {
    throw new HttpException("Already subscribed", 409);
  }
  const data = await CommunityPlatformCommunitySubscriptionCollector.collect({
    body: props.body,
    communityPlatformUsers: userEntity,
  });
  const created =
    await MyGlobal.prisma.community_platform_community_subscriptions.create({
      data,
    });
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUniqueOrThrow(
      {
        where: { id: created.id },
        ...CommunityPlatformCommunitySubscriptionTransformer.select(),
      },
    );
  return await CommunityPlatformCommunitySubscriptionTransformer.transform(
    subscription,
  );
}
