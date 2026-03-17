import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
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
        post_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: CommunityPlatformMemberAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        textContent: {
          select: {
            content: true,
          },
        } satisfies Prisma.community_platform_post_text_contentsFindManyArgs,
        linkUrl: {
          select: {
            url: true,
          },
        } satisfies Prisma.community_platform_post_link_urlsFindManyArgs,
        votes: {
          select: {
            vote_type: true,
          },
        } satisfies Prisma.community_platform_post_votesFindManyArgs,
        _count: {
          select: {
            comments: true,
          },
        },
      },
    } satisfies Prisma.community_platform_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPost> {
    return {
      id: input.id,
      title: input.title,
      postType: input.post_type as "text" | "link" | "image",
      author: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      voteScore: input.votes.reduce(
        (sum, vote) => sum + (vote.vote_type === "upvote" ? 1 : -1),
        0,
      ),
      commentCount: input._count.comments,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      content: input.textContent?.content ?? null,
      url: input.linkUrl?.url ?? null,
    };
  }
}
