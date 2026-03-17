import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";

export namespace CommunityPlatformCommentSnapshotAtSummaryTransformer {
  export type Payload = Prisma.community_platform_comment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        body: true,
        created_at: true,
        parent_comment_id: true,
        post_id: true,
        comment: {
          select: {
            id: true,
            content: true,
            vote_score: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            author: CommunityPlatformMemberAtSummaryTransformer.select(),
            post: CommunityPlatformPostAtSummaryTransformer.select(),
            parent: {
              select: {
                id: true,
                content: true,
                vote_score: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                author: CommunityPlatformMemberAtSummaryTransformer.select(),
                post: CommunityPlatformPostAtSummaryTransformer.select(),
              },
            } satisfies Prisma.community_platform_commentsFindManyArgs,
          },
        } satisfies Prisma.community_platform_commentsFindManyArgs,
        editor: CommunityPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_comment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommentSnapshot.ISummary> {
    return {
      id: input.id,
      status: input.status,
      body: input.body,
      created_at: input.created_at.toISOString(),
      editor: input.editor
        ? await CommunityPlatformMemberAtSummaryTransformer.transform(
            input.editor,
          )
        : null,
      comment: {
        id: input.comment.id,
        content: input.comment.content,
        voteScore: input.comment.vote_score,
        createdAt: input.comment.created_at.toISOString(),
        updatedAt: input.comment.updated_at.toISOString(),
        deletedAt: input.comment.deleted_at
          ? input.comment.deleted_at.toISOString()
          : null,
        author: await CommunityPlatformMemberAtSummaryTransformer.transform(
          input.comment.author,
        ),
        post: await CommunityPlatformPostAtSummaryTransformer.transform(
          input.comment.post,
        ),
        parent: input.comment.parent
          ? {
              id: input.comment.parent.id,
              content: input.comment.parent.content,
              voteScore: input.comment.parent.vote_score,
              createdAt: input.comment.parent.created_at.toISOString(),
              updatedAt: input.comment.parent.updated_at.toISOString(),
              deletedAt: input.comment.parent.deleted_at
                ? input.comment.parent.deleted_at.toISOString()
                : null,
              author:
                await CommunityPlatformMemberAtSummaryTransformer.transform(
                  input.comment.parent.author,
                ),
              post: await CommunityPlatformPostAtSummaryTransformer.transform(
                input.comment.parent.post,
              ),
            }
          : undefined,
      } satisfies ICommunityPlatformComment.ISummary,
    };
  }
}
