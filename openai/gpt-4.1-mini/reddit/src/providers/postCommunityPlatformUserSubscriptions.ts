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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserSubscriptions(props: {
  user: UserPayload;
  body: ICommunityPlatformCommunitySubscription.ICreate;
}): Promise<ICommunityPlatformCommunitySubscription> {
  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: props.user.id },
  });
  if (user === null) throw new HttpException("User not found", 404);
  const communityId = (props.body as any).community_id;
  if (typeof communityId !== "string")
    throw new HttpException("Invalid community ID", 400);
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: communityId },
    });
  if (community === null) throw new HttpException("Community not found", 404);
  const existingSubscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUnique(
      {
        where: {
          community_id_user_id: {
            community_id: communityId,
            user_id: props.user.id,
          },
        },
      },
    );
  if (existingSubscription !== null)
    throw new HttpException("Subscription already exists", 409);
  const data = await CommunityPlatformCommunitySubscriptionCollector.collect({
    body: props.body,
    community,
    user,
  });
  const created =
    await MyGlobal.prisma.community_platform_community_subscriptions.create({
      data,
    });
  return {
    id: created.id,
    community_id: created.community_id,
    user_id: created.user_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
