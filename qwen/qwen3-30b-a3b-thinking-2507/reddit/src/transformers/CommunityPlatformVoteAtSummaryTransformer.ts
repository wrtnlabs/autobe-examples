import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformVoteAtSummaryTransformer {
  export type Payload = Prisma.community_platform_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        vote_type: true,
        votable_type: true,
        votable_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: true,
      },
    } satisfies Prisma.community_platform_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformVote.ISummary> {
    return {
      id: input.id,
      vote_type: input.vote_type,
      votable_type: input.votable_type as "post" | "comment",
      votable_id: input.votable_id,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      user: {},
    };
  }
}
