import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostViewStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";

export namespace CommunityPlatformPostViewStatAtSummaryTransformer {
  export type Payload = Prisma.community_platform_post_view_statsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        view_count: true,
        unique_viewer_count: true,
        created_at: true,
        updated_at: true,
        post: CommunityPlatformPostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_post_view_statsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostViewStat.ISummary> {
    return {
      id: input.id,
      actorType: input.actor_type,
      viewCount: input.view_count,
      uniqueViewerCount: input.unique_viewer_count,
      createdAt: input.created_at.toISOString(),
      post: await CommunityPlatformPostAtSummaryTransformer.transform(
        input.post,
      ),
    };
  }
}
