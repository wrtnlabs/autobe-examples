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
import { CommunityPostAtImagePreviewTransformer } from "./CommunityPostAtImagePreviewTransformer";
import { CommunityPostAtTextPreviewTransformer } from "./CommunityPostAtTextPreviewTransformer";

export namespace CommunityPostAtSummaryTransformer {
  export type Payload = Prisma.community_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        type: true,
        created_at: true,
        author: CommunityMemberAtSummaryTransformer.select(),
        community: CommunityCommunityAtSummaryTransformer.select(),
        votes: {
          select: {
            vote_type: true,
          },
        } satisfies Prisma.community_post_votesFindManyArgs,
        comments: {
          select: {
            id: true,
          },
          where: {
            deleted_at: null,
          },
        } satisfies Prisma.community_commentsFindManyArgs,
        text: CommunityPostAtTextPreviewTransformer.select(),
        link: {
          select: {
            domain: true,
          },
        } satisfies Prisma.community_post_linksDefaultArgs,
        imagePayload: CommunityPostAtImagePreviewTransformer.select(),
      },
    } satisfies Prisma.community_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPost.ISummary> {
    const vote_score = input.votes.reduce(
      (sum, v) =>
        sum +
        (v.vote_type === "upvote" ? 1 : v.vote_type === "downvote" ? -1 : 0),
      0,
    );
    const comment_count = input.comments.length;
    let preview:
      | ICommunityPost.ITextPreview
      | ICommunityPost.ILinkPreview
      | ICommunityPost.IImagePreview;
    if (input.type === "text") {
      preview = await CommunityPostAtTextPreviewTransformer.transform(
        input.text!,
      );
    } else if (input.type === "link") {
      preview = {
        type: "link",
        domain: input.link!.domain,
      } satisfies ICommunityPost.ILinkPreview;
    } else {
      preview = await CommunityPostAtImagePreviewTransformer.transform(
        input.imagePayload!,
      );
    }
    return {
      id: input.id,
      title: input.title,
      type: input.type,
      author: await CommunityMemberAtSummaryTransformer.transform(input.author),
      community: await CommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      vote_score,
      comment_count,
      preview,
      created_at: input.created_at.toISOString(),
    };
  }
}
