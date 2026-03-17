import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

export namespace CommunityCommentTransformer {
  export type Payload = Prisma.community_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        post_id: true,
        parent_id: true,
        content: true,
        created_at: true,
        updated_at: true,
        member: CommunityMemberAtSummaryTransformer.select(),
        votes: {
          select: {
            vote_type: true,
            deleted_at: true,
          },
        } satisfies Prisma.community_comment_votesFindManyArgs,
      },
    } satisfies Prisma.community_commentsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ICommunityComment> {
    const vote_score = input.votes
      .filter((v) => v.deleted_at === null)
      .reduce((sum, v) => sum + (v.vote_type === "up" ? 1 : -1), 0);
    return {
      id: input.id,
      post_id: input.post_id,
      parent_id: input.parent_id,
      author: await CommunityMemberAtSummaryTransformer.transform(input.member),
      content: input.content,
      vote_score,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
