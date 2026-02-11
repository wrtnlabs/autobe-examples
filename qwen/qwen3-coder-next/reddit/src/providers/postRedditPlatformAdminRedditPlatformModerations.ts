import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeration";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAdminRedditPlatformModerations(props: {
  admin: AdminPayload;
  body: IRedditPlatformModeration.ICreate;
}): Promise<IRedditPlatformModeration> {
  const { community_id, user_id, role } = props.body;
  // Fetch community to verify existence
  const community = await MyGlobal.prisma.reddit_platform_communities.findFirst(
    {
      where: { id: community_id },
    },
  );
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Fetch requesting user's moderation record for authorization check
  const requestingModeration =
    await MyGlobal.prisma.reddit_platform_moderations.findFirst({
      where: {
        community_id,
        user_id: props.admin.id,
        role: "OWNER" as const,
      },
    });
  if (!requestingModeration) {
    throw new HttpException(
      "Forbidden: Only community owners can assign moderators",
      403,
    );
  }
  // Verify target user exists and is a member
  const targetUser = await MyGlobal.prisma.reddit_platform_members.findFirst({
    where: { id: user_id },
  });
  if (!targetUser) {
    throw new HttpException("Target user not found", 404);
  }
  // Check for existing moderation assignment
  const existingModeration =
    await MyGlobal.prisma.reddit_platform_moderations.findFirst({
      where: {
        community_id,
        user_id,
      },
    });
  if (existingModeration) {
    throw new HttpException(
      "User is already a moderator of this community",
      409,
    );
  }
  // Create the moderation assignment
  const created = await MyGlobal.prisma.reddit_platform_moderations.create({
    data: {
      id: v4(),
      community_id,
      user_id,
      role: role as "OWNER" | "MODERATOR",
      created_at: new Date(),
    },
    select: {
      id: true,
      community_id: true,
      user_id: true,
      role: true,
      created_at: true,
    },
  });
  const created_at: string & tags.Format<"date-time"> = toISOStringSafe(
    created.created_at,
  );
  // Fetch relations in parallel for response
  const [communitySummary, userSummary] = await Promise.all([
    MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: community_id },
    }),
    MyGlobal.prisma.reddit_platform_members.findUnique({
      where: { id: user_id },
    }),
  ]);
  if (!communitySummary || !userSummary) {
    throw new HttpException("Related data not found", 404);
  }
  return {
    id: created.id,
    community_id: created.community_id,
    user_id: created.user_id,
    role: typia.assert<"OWNER" | "MODERATOR">(created.role),
    created_at,
    community: {
      id: communitySummary.id,
      name: communitySummary.name,
      description: communitySummary.description ?? null,
      iconUrl: communitySummary.icon_url,
      subscriberCount: communitySummary.subscriber_count,
    },
    user: {
      id: userSummary.id,
      username: userSummary.username,
      displayName: userSummary.display_name ?? null,
      avatarUrl: userSummary.avatar_url ?? null,
    },
  };
}
