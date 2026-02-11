import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { ICommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityCommentAtSummaryTransformer } from "./CommunityCommentAtSummaryTransformer";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";
import { CommunityPostAtSummaryTransformer } from "./CommunityPostAtSummaryTransformer";

export namespace CommunityVoteTransformer {
  export type Payload = Prisma.community_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: CommunityMemberAtSummaryTransformer.select(),
        post: CommunityPostAtSummaryTransformer.select(),
        comment: CommunityCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_votesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ICommunityVote> {
    return {
      id: input.id,
      type: typia.assert<"up" | "down">(input.type),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      user: await CommunityMemberAtSummaryTransformer.transform(input.user),
      post: input.post
        ? await CommunityPostAtSummaryTransformer.transform(input.post)
        : null,
      comment: input.comment
        ? await CommunityCommentAtSummaryTransformer.transform(input.comment)
        : null,
    };
  }
}
