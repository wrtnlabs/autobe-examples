import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityCommentAtScoreTransformer {
  export type Payload = Prisma.community_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        vote_score: true,
        upvote_count: true,
        downvote_count: true,
      },
    } satisfies Prisma.community_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityComment.IScore> {
    return {
      vote_score: input.vote_score,
      upvote_count: input.upvote_count,
      downvote_count: input.downvote_count,
    };
  }
}
