import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformUserActivityAtSummaryTransformer {
  export type Payload = Prisma.community_platform_user_activitiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        activity_type: true,
        activity_details: true,
        ip_address: true,
        user_agent: true,
        login_success: true,
        content_created: true,
        engagement_score: true,
        created_at: true,
        updated_at: true,
        user: CommunityPlatformUserAtSummaryTransformer.select(),
        post: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_postsFindManyArgs,
        comment: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_commentsFindManyArgs,
      },
    } satisfies Prisma.community_platform_user_activitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformUserActivity.ISummary> {
    return {
      id: input.id,
      activity_type: input.activity_type,
      content_created: input.content_created ?? null,
      engagement_score: input.engagement_score ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      user: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.user,
      ),
      post_id: input.post?.id ?? null,
      comment_id: input.comment?.id ?? null,
    };
  }
}
