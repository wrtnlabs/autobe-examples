import { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

export namespace CommunityCommentVoteAtSummaryTransformer {
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
        member: CommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_comment_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityCommentVote.ISummary> {
    return {
      id: input.id,
      member: await CommunityMemberAtSummaryTransformer.transform(input.member),
      vote_type: input.vote_type,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
