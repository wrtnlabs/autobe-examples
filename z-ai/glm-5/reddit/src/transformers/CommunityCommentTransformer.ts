import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
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
import { CommunityPostAtSummaryTransformer } from "./CommunityPostAtSummaryTransformer";

export namespace CommunityCommentTransformer {
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
        is_deleted: true,
        created_at: true,
        updated_at: true,
        edited_at: true,
        deleted_at: true,
        author: CommunityMemberAtSummaryTransformer.select(),
        post: CommunityPostAtSummaryTransformer.select(),
        parent: CommunityCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_commentsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ICommunityComment> {
    return {
      id: input.id,
      content: input.is_deleted ? "[deleted]" : input.content,
      voteScore: input.vote_score,
      upvoteCount: input.upvote_count,
      downvoteCount: input.downvote_count,
      isDeleted: input.is_deleted,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      editedAt: input.edited_at ? toISOStringSafe(input.edited_at) : null,
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      author: input.is_deleted
        ? {
            id: input.author.id,
            username: "[deleted]",
            displayName: null,
            avatarUrl: null,
            karma: input.author.karma,
            createdAt: toISOStringSafe(input.author.created_at),
          }
        : await CommunityMemberAtSummaryTransformer.transform(input.author),
      post: await CommunityPostAtSummaryTransformer.transform(input.post),
      parent: input.parent
        ? await CommunityCommentAtSummaryTransformer.transform(input.parent)
        : null,
    };
  }
}
