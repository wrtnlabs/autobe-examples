import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformPostAtSummaryTransformer {
  export type Payload = Prisma.community_platform_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        vote_score: true,
        comment_count: true,
        author: {
          select: {
            id: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            subscriber_count: true,
            created_at: true,
          },
        },
        title: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPost.ISummary> {
    return {
      id: input.id,
      createdAt: toISOStringSafe(input.created_at),
      voteScore: input.vote_score,
      commentCount: input.comment_count,
      author: {
        id: input.author.id,
      },
      community: {
        name: input.community.name,
        description: input.community.description,
        icon: (input.community.icon ?? "") satisfies string as string,
        subscriber_count: input.community.subscriber_count,
        created_at: toISOStringSafe(input.community.created_at),
      },
    };
  }
}
