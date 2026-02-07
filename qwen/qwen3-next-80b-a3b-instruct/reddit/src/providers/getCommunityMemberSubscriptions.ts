import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityCommunityActorTransformer } from "../transformers/CommunityCommunityActorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityMemberSubscriptions(props: {
  member: MemberPayload;
}): Promise<IPageICommunityCommunity.ISummary> {
  const { member } = props;
  // Get the most recent subscription created_at as cursor
  const firstSubscription =
    await MyGlobal.prisma.community_subscriptions.findFirst({
      where: {
        community_member_id: member.id,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  const cursor =
    firstSubscription?.created_at ?? new Date("1970-01-01T00:00:00Z");
  // Fetch subscriptions with cursor-based pagination
  const communities = await MyGlobal.prisma.community_subscriptions.findMany({
    where: {
      community_member_id: member.id,
      created_at: {
        lt: cursor,
      },
    },
    take: 20,
    orderBy: {
      created_at: "desc",
    },
    select: {
      community_community_id: true,
      created_at: true,
    },
  });
  // Extract community IDs
  const communityIds = communities.map((sub) => sub.community_community_id);
  // Fetch full community details WITH owner relation
  // Correct selection: use correct relation name 'owner' and select owner's properties
  const communityDetails = await MyGlobal.prisma.community_communities.findMany(
    {
      where: {
        id: { in: communityIds },
      },
      select: {
        id: true,
        name: true,
        description: true,
        icon_url: true,
        created_at: true,
        updated_at: true, // ADD MISSING FIELD
        owner: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    },
  );
  // Create ID-to-community map for fast lookup
  const communityMap = new Map(communityDetails.map((comm) => [comm.id, comm]));
  // Transform using available transformer
  const transformedCommunities = await ArrayUtil.asyncMap(
    communities,
    async (sub) =>
      CommunityCommunityActorTransformer.transform(
        communityMap.get(sub.community_community_id)!,
      ),
  );
  // Count total subscriptions for pagination
  const total = await MyGlobal.prisma.community_subscriptions.count({
    where: {
      community_member_id: member.id,
    },
  });
  // Calculate pagination metadata
  const limit = 20;
  const current = 1;
  const pages = Math.ceil(total / limit);
  return {
    data: transformedCommunities,
    pagination: {
      current,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  };
}
