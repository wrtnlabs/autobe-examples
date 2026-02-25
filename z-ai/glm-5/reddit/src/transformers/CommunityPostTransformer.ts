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

export namespace CommunityPostTransformer {
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
        image_url: true,
        image_thumbnail_url: true,
        vote_score: true,
        upvote_count: true,
        downvote_count: true,
        comment_count: true,
        created_at: true,
        edited_at: true,
        author: CommunityMemberAtSummaryTransformer.select(),
        community: CommunityCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_postsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ICommunityPost> {
    return {
      id: input.id,
      title: input.title,
      postType: input.post_type as "TEXT" | "LINK" | "IMAGE",
      textContent: input.text_content ?? null,
      linkUrl: input.link_url ?? null,
      imageUrl: input.image_url ?? null,
      imageThumbnailUrl: input.image_thumbnail_url ?? null,
      voteScore: input.vote_score,
      upvoteCount: input.upvote_count,
      downvoteCount: input.downvote_count,
      commentCount: input.comment_count,
      author: await CommunityMemberAtSummaryTransformer.transform(input.author),
      community: await CommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      createdAt: input.created_at.toISOString(),
      editedAt: input.edited_at?.toISOString() ?? null,
    };
  }
}
