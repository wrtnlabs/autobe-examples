import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformPostVoteCommentAtSummaryTransformer {
  export type Payload = Prisma.community_platform_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        parent_comment_id: true,
        posted_at: true,
        body_text: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: CommunityPlatformMemberAtSummaryTransformer.select(),
        editedBy: CommunityPlatformMemberAtSummaryTransformer.select(),
        deletedBy: CommunityPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostVoteComment.ISummary> {
    return {
      id: input.id,
      parent_comment_id: input.parent_comment_id ?? null,
      author: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      editedBy: input.editedBy
        ? await CommunityPlatformMemberAtSummaryTransformer.transform(
            input.editedBy,
          )
        : null,
      deletedBy: input.deletedBy
        ? await CommunityPlatformMemberAtSummaryTransformer.transform(
            input.deletedBy,
          )
        : null,
      posted_at: input.posted_at.toISOString(),
      body_text: input.body_text,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
