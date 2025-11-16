import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function postRedditCommunityRegisteredUserRedditCommunitySubscriptions(props: {
  registeredUser: RegisteredUserPayload;
  body: IRedditCommunitySubscription.ICreate;
}): Promise<IRedditCommunitySubscription> {
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.reddit_community_subscriptions.create({
    data: {
      id,
      reddit_community_registered_user_id: props.registeredUser.id,
      reddit_community_community_id: props.body.redditCommunity_community_id,
      created_at: now,
      updated_at: now,
    },
  });

  const registeredUser =
    await MyGlobal.prisma.reddit_community_registered_users.findUnique({
      where: { id: props.registeredUser.id },
      select: { id: true, email: true, created_at: true, updated_at: true },
    });

  if (!registeredUser) {
    throw new HttpException("Registered user not found", 404);
  }

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: props.body.redditCommunity_community_id },
      select: {
        id: true,
        name: true,
        status: true,
        description: true,
        creator_id: true,
        created_at: true,
        updated_at: true,
      },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  return {
    id: created.id as string & tags.Format<"uuid">,
    registeredUser: {
      id: registeredUser.id as string & tags.Format<"uuid">,
      username: registeredUser.email, // Using email as username placeholder
      profile_image_url: undefined, // Field not present in schema, set to undefined
    },
    community: {
      id: community.id as string & tags.Format<"uuid">,
      communityName: community.name, // Using 'name' as replacement for 'communityName'
      status: community.status,
      creator_id: community.creator_id as string & tags.Format<"uuid">,
    },
    created_at: toISOStringSafe(created.created_at),
    updated_at: created.updated_at
      ? toISOStringSafe(created.updated_at)
      : undefined,
  };
}
