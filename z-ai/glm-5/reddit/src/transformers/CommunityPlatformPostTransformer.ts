import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformPostTransformer {
  export type Payload = Prisma.community_platform_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content_type: true,
        text_content: true,
        link_url: true,
        image_url: true,
        score: true,
        comment_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        author: CommunityPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPost> {
    return {
      id: input.id,
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      author: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      title: input.title,
      content_type: input.content_type as "text" | "link" | "image",
      text_content: input.text_content,
      link_url: input.link_url,
      image_url: input.image_url,
      score: input.score,
      comment_count: input.comment_count,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
