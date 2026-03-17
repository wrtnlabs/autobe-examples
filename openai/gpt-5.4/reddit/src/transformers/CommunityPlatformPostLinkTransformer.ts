import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";

export namespace CommunityPlatformPostLinkTransformer {
  export type Payload = Prisma.community_platform_post_linksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        post: CommunityPlatformPostAtSummaryTransformer.select(),
        target_url: true,
        domain_display: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_post_linksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostLink> {
    return {
      id: input.id,
      post: await CommunityPlatformPostAtSummaryTransformer.transform(
        input.post,
      ),
      target_url: input.target_url,
      domain_display: input.domain_display,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
