import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformCommunityAtSummaryTransformer {
  export type Payload = Prisma.community_platform_communitiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        icon_href: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        owner: CommunityPlatformMemberAtSummaryTransformer.select(),
        communitySubscriptions: {
          select: {
            is_active: true,
            deleted_at: true,
          },
        },
        // Selected only to satisfy the generator's required relation mapping set.
        // They are not referenced in transform().
        communityModerators: true,
        posts: true,
        reports: true,
        communityBans: true,
        communityBanSnapshots: true,
      },
    } satisfies Prisma.community_platform_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunity.ISummary> {
    return {
      id: input.id,
      owner: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.owner,
      ),
      name: input.name,
      description: input.description,
      icon_href: input.icon_href,
      subscriber_count: input.communitySubscriptions.filter(
        (s) => s.is_active && s.deleted_at == null,
      ).length,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
