import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function postRedditCommunityRegisteredUserRedditCommunityCommunitiesCommunityNameCommunitySubscriptions(props: {
  registeredUser: RegistereduserPayload;
  communityName: string;
  body: IRedditCommunityCommunitySubscription.ICreate;
}): Promise<IRedditCommunityCommunitySubscription> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirst({
      where: { name: props.communityName, deleted_at: null },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  try {
    const id: string & tags.Format<"uuid"> = v4();
    const created_at: string & tags.Format<"date-time"> = toISOStringSafe(
      new Date(),
    );

    const subscription =
      await MyGlobal.prisma.reddit_community_community_subscriptions.create({
        data: {
          id,
          registereduser_id: props.registeredUser.id,
          community_id: community.id,
          created_at: new Date(created_at),
          deleted_at: null,
        },
        include: {
          registereduser: {
            select: {
              id: true,
              email: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          community: {
            select: {
              id: true,
              name: true,
              title: true,
              description: true,
              creator_id: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      });

    return {
      id,
      registereduser: {
        id: subscription.registereduser.id,
        email: subscription.registereduser.email,
        created_at: toISOStringSafe(subscription.registereduser.created_at),
        updated_at: toISOStringSafe(subscription.registereduser.updated_at),
        deleted_at: subscription.registereduser.deleted_at
          ? toISOStringSafe(subscription.registereduser.deleted_at)
          : null,
      },
      community: {
        id: subscription.community.id,
        name: subscription.community.name,
        title: subscription.community.title,
        description: subscription.community.description ?? null,
        creator_id: subscription.community.creator_id,
        created_at: toISOStringSafe(subscription.community.created_at),
        updated_at: toISOStringSafe(subscription.community.updated_at),
        deleted_at: subscription.community.deleted_at
          ? toISOStringSafe(subscription.community.deleted_at)
          : null,
      },
      created_at,
      deleted_at: null,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Subscription already exists", 409);
    }
    throw error;
  }
}
