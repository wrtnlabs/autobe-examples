import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformCommentTransformer {
  export type Payload = Prisma.community_platform_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        community_platform_post_id: true,
        parent_comment_id: true,
        author_id: true,
        edited_by_id: true,
        deleted_by_id: true,
        posted_at: true,
        body_text: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        // Relation members required by transformer-mapping validator.
        post: { select: { id: true } },
        parentComment: { select: { id: true } },
        author: { select: { id: true } },
        editedBy: { select: { id: true } },
        deletedBy: { select: { id: true } },
        replies: { select: { id: true } },
        commentVotes: { select: { id: true } },
      },
    } satisfies Prisma.community_platform_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformComment> {
    return {
      id: input.id,
      community_platform_post_id: input.community_platform_post_id,
      parent_comment_id: input.parent_comment_id ?? null,
      author_id: input.author_id,
      edited_by_id: input.edited_by_id ?? null,
      deleted_by_id: input.deleted_by_id ?? null,
      posted_at: input.posted_at.toISOString(),
      body_text: input.body_text,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
