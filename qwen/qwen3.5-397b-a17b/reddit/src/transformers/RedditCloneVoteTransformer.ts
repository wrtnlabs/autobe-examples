import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneVoteTransformer {
  export type Payload = Prisma.reddit_clone_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        member: RedditCloneMemberAtSummaryTransformer.select(),
        target_type: true,
        target_id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.reddit_clone_votesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditCloneVote> {
    return {
      id: input.id,
      member: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      target_type: input.target_type,
      target_id: input.target_id,
      vote_type: input.vote_type,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
