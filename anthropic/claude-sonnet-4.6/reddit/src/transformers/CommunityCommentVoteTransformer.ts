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
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: CommunityMemberAtSummaryTransformer.select() as any,
        comment: CommunityCommentAtSummaryTransformer.select() as any,
      },
    } satisfies Prisma.community_comment_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityCommentVote> {
    return {
      id: input.id,
      member: await CommunityMemberAtSummaryTransformer.transform(
        input.member as any,
      ),
      comment: await CommunityCommentAtSummaryTransformer.transform(
        input.comment as any,
      ),
      vote_type: input.vote_type,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
