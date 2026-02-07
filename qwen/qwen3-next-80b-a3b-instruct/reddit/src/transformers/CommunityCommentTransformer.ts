import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityCommentTransformer {
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
        deleted_at: true,
        status: true,
        parent: {
          select: {
            id: true,
          },
        },
        community_member_id: true,
        community_post_id: true,
      },
    } satisfies Prisma.community_commentsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ICommunityComment> {
    return {
      id: input.id,
      content: input.content,
      created_at:
        input.created_at !== null && input.created_at !== undefined
          ? toISOStringSafe(input.created_at)
          : new Date().toISOString(),
      updated_at:
        input.updated_at !== null && input.updated_at !== undefined
          ? toISOStringSafe(input.updated_at)
          : new Date().toISOString(),
      deleted_at:
        input.deleted_at !== null && input.deleted_at !== undefined
          ? toISOStringSafe(input.deleted_at)
          : new Date().toISOString(),
      status: input.status,
      author: input.community_member_id,
      post: input.community_post_id,
    };
  }
}
