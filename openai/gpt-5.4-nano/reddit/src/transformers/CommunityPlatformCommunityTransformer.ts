import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

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
        icon_href: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        owner: CommunityPlatformMemberAtSummaryTransformer.select(),
        communitySubscriptions: {
          select: {
            id: true,
            is_active: true,
          },
        },
        communityModerators: {
          select: { id: true },
        },
        posts: {
          select: { id: true },
        },
        reports: {
          select: { id: true },
        },
        communityBans: {
          select: { id: true },
        },
        communityBanSnapshots: {
          select: { id: true },
        },
      },
    } satisfies Prisma.community_platform_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunity> {
    return {
      id: input.id,
      owner: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.owner,
      ),
      name: input.name,
      description: input.description,
      iconHref: input.icon_href,
      subscriberCount: input.communitySubscriptions.reduce(
        (acc, s) => acc + (s.is_active ? 1 : 0),
        0,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
