import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

export namespace CommunityPostVoteAtSummaryTransformer {
  export type Payload = Prisma.community_post_votesGetPayload<
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
    } satisfies Prisma.community_post_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPostVote.ISummary> {
    return {
      id: input.id,
      vote_type: input.vote_type,
      voter: await CommunityMemberAtSummaryTransformer.transform(input.member),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
