import { ICommunityPlatformVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformVoteCommentTransformer {
  export type Payload = Prisma.community_platform_vote_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        community_platform_comment_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        vote: {
          select: {
            direction: true,
          },
        },
      },
    } satisfies Prisma.community_platform_vote_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformVoteComment> {
    return {
      id: input.id,
      community_platform_comment_id: input.community_platform_comment_id,
      direction: input.vote.direction > 0,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
