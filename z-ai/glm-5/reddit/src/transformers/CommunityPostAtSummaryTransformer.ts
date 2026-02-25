import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityCommunityAtSummaryTransformer } from "./CommunityCommunityAtSummaryTransformer";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

export namespace CommunityPostAtSummaryTransformer {
  export type Payload = Prisma.community_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        text_content: true,
        link_url: true,
        image_thumbnail_url: true,
        vote_score: true,
        comment_count: true,
        edited_at: true,
        created_at: true,
        author: CommunityMemberAtSummaryTransformer.select(),
        community: CommunityCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPost.ISummary> {
    // Compute text_preview: first 200 chars of text_content for TEXT posts only
    const textPreview: string | null =
      input.post_type === "TEXT" && input.text_content
        ? input.text_content.length > 200
          ? input.text_content.substring(0, 200) + "..."
          : input.text_content
        : null;
    // Compute link_domain: extract domain from link_url for LINK posts only
    let linkDomain: string | null = null;
    if (input.post_type === "LINK" && input.link_url) {
      try {
        const url = new URL(input.link_url);
        linkDomain = url.hostname;
      } catch {
        linkDomain = null;
      }
    }
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      author: await CommunityMemberAtSummaryTransformer.transform(input.author),
      community: await CommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      vote_score: input.vote_score,
      comment_count: input.comment_count,
      text_preview: textPreview,
      link_domain: linkDomain,
      image_thumbnail_url: input.image_thumbnail_url,
      edited_at: input.edited_at ? input.edited_at.toISOString() : null,
      created_at: input.created_at.toISOString(),
    };
  }
}
