import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityCommentAtSummaryTransformer } from "./CommunityCommentAtSummaryTransformer";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

export namespace CommunityCommentVoteTransformer {
  export type Payload = Prisma.community_comment_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        direction: true,
        created_at: true,
        updated_at: true,
        member: CommunityMemberAtSummaryTransformer.select(),
        comment: CommunityCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_comment_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityCommentVote> {
    return {
      id: input.id,
      direction: input.direction,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      author: await CommunityMemberAtSummaryTransformer.transform(input.member),
      comment: await CommunityCommentAtSummaryTransformer.transform(
        input.comment,
      ),
    };
  }
}
