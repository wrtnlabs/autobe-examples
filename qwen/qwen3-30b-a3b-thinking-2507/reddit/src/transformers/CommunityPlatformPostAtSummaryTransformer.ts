import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberTransformer } from "./CommunityPlatformMemberTransformer";

export namespace CommunityPlatformPostAtSummaryTransformer {
  export type Payload = Prisma.community_platform_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        author: CommunityPlatformMemberTransformer.select(),
        community_platform_post_text_contents: true,
        community_platform_post_links: true,
        community_platform_post_images: { select: {} },
        community_platform_post_snapshots: { select: {} },
        _count: {
          community_platform_post_comments: true,
          community_platform_votes: true,
        },
      },
    } satisfies Prisma.community_platform_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPost.ISummary> {
    return {
      id: input.id,
      title: input.title,
      content_type: input.content_type,
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      author: await CommunityPlatformMemberTransformer.transform(input.author),
      created_at: toISOStringSafe(input.created_at),
      comments_count: input._count.community_platform_post_comments,
      votes: input._count.community_platform_votes,
    };
  }
}
