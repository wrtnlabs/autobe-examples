import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";
import { CommunityPlatformPostVoteCommentAtSummaryTransformer } from "./CommunityPlatformPostVoteCommentAtSummaryTransformer";

export namespace CommunityPlatformPostVoteCommentTransformer {
  export type Payload = Prisma.community_platform_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        posted_at: true,
        body_text: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: CommunityPlatformMemberAtSummaryTransformer.select(),
        editedBy: CommunityPlatformMemberAtSummaryTransformer.select(),
        deletedBy: CommunityPlatformMemberAtSummaryTransformer.select(),
        post: CommunityPlatformPostAtSummaryTransformer.select(),
        parentComment:
          CommunityPlatformPostVoteCommentAtSummaryTransformer.select(),
        replies: {
          select: { id: true },
        },
        commentVotes: {
          select: { id: true },
        },
      },
    } satisfies Prisma.community_platform_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostVoteComment> {
    return {
      id: input.id,
      author: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      post: await CommunityPlatformPostAtSummaryTransformer.transform(
        input.post,
      ),
      bodyText: input.body_text,
      parent: input.parentComment
        ? await CommunityPlatformPostVoteCommentAtSummaryTransformer.transform(
            input.parentComment,
          )
        : null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
