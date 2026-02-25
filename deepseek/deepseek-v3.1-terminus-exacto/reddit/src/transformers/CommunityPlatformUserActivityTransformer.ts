import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentAtSummaryTransformer } from "./CommunityPlatformCommentAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformUserActivityTransformer {
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
        post: CommunityPlatformPostAtSummaryTransformer.select(),
        comment: CommunityPlatformCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_user_activitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformUserActivity> {
    return {
      id: input.id,
      activity_type: input.activity_type,
      activity_details: input.activity_details ?? undefined,
      ip_address: input.ip_address ?? undefined,
      user_agent: input.user_agent ?? undefined,
      login_success: input.login_success ?? undefined,
      content_created: input.content_created ?? undefined,
      engagement_score: input.engagement_score ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      user: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.user,
      ),
      post: input.post
        ? await CommunityPlatformPostAtSummaryTransformer.transform(input.post)
        : null,
      comment: input.comment
        ? await CommunityPlatformCommentAtSummaryTransformer.transform(
            input.comment,
          )
        : null,
    };
  }
}
