import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";
import { CommunityPostAtSummaryTransformer } from "./CommunityPostAtSummaryTransformer";

export namespace CommunityCommentAtSummaryTransformer {
  export type Payload = Prisma.community_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        vote_score: true,
        upvote_count: true,
        downvote_count: true,
        created_at: true,
        edited_at: true,
        author: CommunityMemberAtSummaryTransformer.select(),
        post: CommunityPostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityComment.ISummary> {
    return {
      id: input.id,
      content: input.content,
      vote_score: input.vote_score,
      upvote_count: input.upvote_count,
      downvote_count: input.downvote_count,
      created_at: input.created_at.toISOString(),
      edited_at: input.edited_at ? input.edited_at.toISOString() : null,
      author: await CommunityMemberAtSummaryTransformer.transform(input.author),
      post: await CommunityPostAtSummaryTransformer.transform(input.post),
    };
  }
}
