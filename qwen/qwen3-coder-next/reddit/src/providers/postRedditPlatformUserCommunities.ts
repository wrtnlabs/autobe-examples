import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postRedditPlatformUserCommunities(props: {
  user: UserPayload;
  body: IRedditPlatformCommunity.ICreate;
}): Promise<IRedditPlatformCommunity> {
  // Create the community record with empty values since ICreate DTO has no properties
  const community = await MyGlobal.prisma.reddit_platform_communities.create({
    data: {
      id: v4(),
      owner_id: props.user.id,
      name: "",
      description: null,
      icon_url: null,
      subscriber_count: 1,
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
  // Create initial subscription record
  await MyGlobal.prisma.reddit_platform_community_subscriptions.create({
    data: {
      id: v4(),
      user_id: props.user.id,
      community_id: community.id,
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
  // Return the created community with proper type conversion
  return {
    id: community.id,
    owner_id: community.owner_id,
    name: community.name,
    description: community.description,
    icon_url: community.icon_url,
    subscriber_count: community.subscriber_count,
    created_at: community.created_at,
    updated_at: community.updated_at,
  };
}
