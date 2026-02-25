import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostView } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostView";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformPostViewTransformer {
  export type Payload = Prisma.community_platform_post_viewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        ip_address: true,
        user_agent: true,
        referrer: true,
        view_duration: true,
        post: CommunityPlatformPostAtSummaryTransformer.select(),
        user: CommunityPlatformUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_post_viewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostView> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      ip_address: input.ip_address ?? null,
      user_agent: input.user_agent ?? null,
      referrer: input.referrer ?? null,
      view_duration: input.view_duration ?? null,
      post: await CommunityPlatformPostAtSummaryTransformer.transform(
        input.post,
      ),
      user: input.user
        ? await CommunityPlatformUserAtSummaryTransformer.transform(input.user)
        : null,
    };
  }
}
