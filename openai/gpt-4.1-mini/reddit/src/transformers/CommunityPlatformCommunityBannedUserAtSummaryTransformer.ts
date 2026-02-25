import { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformCommunityBannedUserAtSummaryTransformer {
  export type Payload =
    Prisma.community_platform_community_banned_usersGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        banned_at: true,
        unbanned_at: true,
        ban_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: {
          select: { id: true },
        },
        user: CommunityPlatformUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_community_banned_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityBannedUser.ISummary> {
    return {
      id: input.id,
      bannedAt: input.banned_at.toISOString(),
      unbannedAt: input.unbanned_at?.toISOString() ?? null,
      banReason: input.ban_reason,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      user: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.user,
      ),
    };
  }
}
