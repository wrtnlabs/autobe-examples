import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformCommunityTransformer {
  export type Payload = Prisma.community_platform_communitiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        icon_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        ownerUser: CommunityPlatformUserAtSummaryTransformer.select(),
        subscriptions: {
          select: { id: true },
        } satisfies Prisma.community_platform_community_subscriptionsFindManyArgs,
        posts: {
          select: { id: true },
        } satisfies Prisma.community_platform_postsFindManyArgs,
        bans: {
          select: { id: true },
        } satisfies Prisma.community_platform_community_bansFindManyArgs,
        communityBannedUsers: {
          select: { id: true },
        } satisfies Prisma.community_platform_community_banned_usersFindManyArgs,
        communityModerators: {
          select: { id: true },
        } satisfies Prisma.community_platform_community_moderatorsFindManyArgs,
        bannedUsers: {
          select: { id: true },
        } satisfies Prisma.community_platform_banned_usersFindManyArgs,
      },
    } satisfies Prisma.community_platform_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunity> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      iconUrl: input.icon_url,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      ownerUser: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.ownerUser,
      ),
      subscriberCount: input.subscriptions.length > 0,
    };
  }
}
