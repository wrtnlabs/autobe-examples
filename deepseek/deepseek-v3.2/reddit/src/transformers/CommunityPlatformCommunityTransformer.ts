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
        created_at: true,
        updated_at: true,
        deleted_at: true,
        ownerMember: CommunityPlatformMemberAtSummaryTransformer.select(),
        subscriberCount: {
          select: {
            subscriber_count: true,
          },
        } satisfies Prisma.community_platform_mv_community_subscriber_countsFindManyArgs,
        snapshots: false,
        images: false,
        moderationRoles: false,
        bans: false,
        communitySubscriptions: false,
        subscriptionActivities: false,
        posts: false,
        contentReports: false,
        userReports: false,
      },
    } satisfies Prisma.community_platform_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunity> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      owner: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.ownerMember,
      ),
      subscriber_count: input.subscriberCount?.subscriber_count ?? 0,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
