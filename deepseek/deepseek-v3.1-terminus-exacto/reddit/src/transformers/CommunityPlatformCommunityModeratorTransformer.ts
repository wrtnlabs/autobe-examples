import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformCommunityModeratorTransformer {
  export type Payload =
    Prisma.community_platform_community_moderatorsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        assigned_at: true,
        role_level: true,
        is_active: true,
        notes: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: CommunityPlatformUserAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        assigned_by_user: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
            karma: true,
            created_at: true,
          },
        } satisfies Prisma.community_platform_usersFindManyArgs,
      },
    } satisfies Prisma.community_platform_community_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityModerator> {
    return {
      id: input.id,
      assigned_at: toISOStringSafe(input.assigned_at),
      role_level: input.role_level,
      is_active: input.is_active,
      notes: input.notes ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at
        ? toISOStringSafe(input.deleted_at)
        : undefined,
      user: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.user,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      assigned_by: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.assigned_by_user,
      ),
    };
  }
}
