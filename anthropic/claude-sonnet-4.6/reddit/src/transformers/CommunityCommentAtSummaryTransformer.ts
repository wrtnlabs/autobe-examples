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
        created_at: true,
        updated_at: true,
        member: CommunityMemberAtSummaryTransformer.select(),
        post: CommunityPostAtSummaryTransformer.select(),
        parent: {
          select: {
            id: true,
          },
        },
        votes: {
          select: {
            vote_type: true,
          },
        },
        children: {
          select: {
            deleted_at: true,
          },
        } satisfies Prisma.community_commentsFindManyArgs,
      },
    } satisfies Prisma.community_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityComment.ISummary> {
    return {
      id: input.id,
      author: await CommunityMemberAtSummaryTransformer.transform(input.member),
      post: await CommunityPostAtSummaryTransformer.transform(input.post),
      parent_id: input.parent?.id ?? null,
      content: input.content,
      vote_score: input.votes.reduce(
        (sum, v) => sum + (v.vote_type === "up" ? 1 : -1),
        0,
      ),
      reply_count: input.children.filter((c) => c.deleted_at === null).length,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
