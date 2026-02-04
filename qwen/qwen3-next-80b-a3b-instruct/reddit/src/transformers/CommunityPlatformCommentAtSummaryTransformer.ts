import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformCommentAtSummaryTransformer {
  export type Payload = Prisma.community_platform_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        created_at: true,
        _count: {
          select: {
            community_platform_comment_votes: true,
            recursive: true,
          },
        },
      },
    } satisfies Prisma.community_platform_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformComment.ISummary> {
    return {
      id: input.id,
      content: input.content.substring(0, 300),
      voteScore: input._count.community_platform_comment_votes,
      createdAt: input.created_at.toISOString(),
      replyCount: input._count.recursive,
    };
  }
}
