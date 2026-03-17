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

export namespace CommunityPlatformCommentSnapshotTransformer {
  export type Payload = Prisma.community_platform_comment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        body: true,
        parent_comment_id: true,
        post_id: true,
        created_at: true,
        comment: {
          select: {
            id: true,
            content: true,
            created_at: true,
            author: CommunityPlatformMemberAtSummaryTransformer.select(),
            post: CommunityPlatformPostAtSummaryTransformer.select(),
          },
        } satisfies Prisma.community_platform_commentsFindManyArgs,
        editor: CommunityPlatformMemberAtSummaryTransformer.select(),
        // post: CommunityPlatformPostAtSummaryTransformer.select(), // removed because it doesn't exist in the select type
      },
    } satisfies Prisma.community_platform_comment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommentSnapshot> {
    return {
      id: input.id,
      comment: {
        id: input.comment.id,
        content: input.comment.content,
        voteScore: 0, // Default since not selected
        createdAt: toISOStringSafe(input.comment.created_at),
        updatedAt: toISOStringSafe(input.comment.created_at), // Default
        deletedAt: null, // Default
        author: await CommunityPlatformMemberAtSummaryTransformer.transform(
          input.comment.author,
        ),
        post: await CommunityPlatformPostAtSummaryTransformer.transform(
          input.comment.post,
        ),
        parent: null, // Not applicable for snapshot context
      } satisfies ICommunityPlatformComment.ISummary,
      editor: input.editor
        ? await CommunityPlatformMemberAtSummaryTransformer.transform(
            input.editor,
          )
        : null,
      status: input.status as "created" | "edited" | "deleted",
      body: input.body,
      parent_comment: null, // Need to handle parent comment reference
      post: await CommunityPlatformPostAtSummaryTransformer.transform(
        input.comment.post,
      ),
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
