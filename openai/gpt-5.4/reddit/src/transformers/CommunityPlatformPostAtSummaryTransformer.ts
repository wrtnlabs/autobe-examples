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

export namespace CommunityPlatformPostAtSummaryTransformer {
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPost.ISummary> {
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      status: input.status,
      author: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      vote_count: input.votes.reduce((acc, vote) => {
        if (vote.deleted_at !== null) return acc;
        if (vote.direction === "upvote") return acc + 1;
        if (vote.direction === "downvote") return acc - 1;
        return acc;
      }, 0),
      comment_count: input.comments.filter(
        (comment) => comment.deleted_at === null,
      ).length,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        status: true,
        author: CommunityPlatformMemberAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        votes: {
          select: {
            direction: true,
            deleted_at: true,
          },
        } satisfies Prisma.community_platform_post_votesFindManyArgs,
        comments: {
          select: {
            deleted_at: true,
          },
        } satisfies Prisma.community_platform_commentsFindManyArgs,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_postsFindManyArgs;
  }
  export type Payload = Prisma.community_platform_postsGetPayload<
    ReturnType<typeof select>
  >;
}
