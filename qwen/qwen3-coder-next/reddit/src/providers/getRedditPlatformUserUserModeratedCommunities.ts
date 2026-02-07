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

export async function getRedditPlatformUserUserModeratedCommunities(props: {
  user: UserPayload;
}): Promise<IRedditPlatformCommunity.ISummary> {
  // Query all community roles for the authenticated user
  const roles = await MyGlobal.prisma.reddit_platform_community_roles.findMany({
    where: {
      user_id: props.user.id,
      role: {
        in: ["owner", "moderator"],
      },
    },
    select: {
      community_id: true,
      role: true,
      created_at: true,
      updated_at: true,
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
          subscriber_count: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  // Since IRedditPlatformCommunity.ISummary is defined as an empty type {},
  // we return an empty object as specified in the DTO
  return {};
}
