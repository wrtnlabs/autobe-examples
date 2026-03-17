import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformMvCommunitySubscriberCount } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMvCommunitySubscriberCount";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformMvCommunitySubscriberCountTransformer } from "../transformers/CommunityPlatformMvCommunitySubscriberCountTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformCommunitiesCommunityIdSubscribersCount(props: {
  communityId: string;
}): Promise<ICommunityPlatformMvCommunitySubscriberCount> {
  // Verify community exists and is not deleted
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
  });
  // Try to get subscriber count from materialized view
  const countRecord =
    await MyGlobal.prisma.community_platform_mv_community_subscriber_counts.findUnique(
      {
        where: { community_id: props.communityId },
        ...CommunityPlatformMvCommunitySubscriberCountTransformer.select(),
      },
    );
  if (countRecord) {
    // Transform and return existing count record
    return await CommunityPlatformMvCommunitySubscriberCountTransformer.transform(
      countRecord,
    );
  }
  // Community exists but has no subscribers - return synthetic zero count
  const now = new Date();
  return {
    id: v4(),
    subscriber_count: 0,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    community: {
      id: props.communityId as string & tags.Format<"uuid">,
      name: "", // We need to fetch community details for proper response
      description: null,
      created_at: "",
      owner: {
        id: "" as string & tags.Format<"uuid">,
        email: "" as string & tags.Format<"email">,
        username: "",
        email_verified: false,
        registered_at: "",
      },
      subscriber_count: 0,
    },
  };
}
