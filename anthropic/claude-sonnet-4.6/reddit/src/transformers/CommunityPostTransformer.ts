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
import { CommunityPostAtImageContentTransformer } from "./CommunityPostAtImageContentTransformer";
import { CommunityPostAtLinkContentTransformer } from "./CommunityPostAtLinkContentTransformer";
import { CommunityPostAtTextContentTransformer } from "./CommunityPostAtTextContentTransformer";

export namespace CommunityPostTransformer {
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
        updated_at: true,
        deleted_at: true,
        author: CommunityMemberAtSummaryTransformer.select(),
        community: CommunityCommunityAtSummaryTransformer.select(),
        text: CommunityPostAtTextContentTransformer.select(),
        link: CommunityPostAtLinkContentTransformer.select(),
        imagePayload: CommunityPostAtImageContentTransformer.select(),
        votes: {
          select: {
            vote_type: true,
          },
        } satisfies Prisma.community_post_votesFindManyArgs,
        comments: {
          select: {
            deleted_at: true,
          },
        } satisfies Prisma.community_commentsFindManyArgs,
      },
    } satisfies Prisma.community_postsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ICommunityPost> {
    let content:
      | ICommunityPost.ITextContent
      | ICommunityPost.ILinkContent
      | ICommunityPost.IImageContent;
    if (input.type === "text" && input.text !== null) {
      content = await CommunityPostAtTextContentTransformer.transform(
        input.text,
      );
    } else if (input.type === "link" && input.link !== null) {
      content = await CommunityPostAtLinkContentTransformer.transform(
        input.link,
      );
    } else {
      content = await CommunityPostAtImageContentTransformer.transform(
        input.imagePayload!,
      );
    }
    const upvotes = input.votes.filter((v) => v.vote_type === "upvote").length;
    const downvotes = input.votes.filter(
      (v) => v.vote_type === "downvote",
    ).length;
    return {
      id: input.id,
      title: input.title,
      type: input.type,
      content,
      author: await CommunityMemberAtSummaryTransformer.transform(input.author),
      community: await CommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      voteScore: upvotes - downvotes,
      commentCount: input.comments.filter((c) => c.deleted_at === null).length,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
