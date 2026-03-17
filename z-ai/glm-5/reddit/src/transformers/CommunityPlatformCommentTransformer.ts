import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentAtSummaryTransformer } from "./CommunityPlatformCommentAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformCommentTransformer {
  type SelectShape = {
    select: {
      id: true;
      content: true;
      vote_score: true;
      created_at: true;
      updated_at: true;
      deleted_at: true;
      author: ReturnType<
        typeof CommunityPlatformMemberAtSummaryTransformer.select
      >;
      parentComment: ReturnType<
        typeof CommunityPlatformCommentAtSummaryTransformer.select
      >;
      replies: SelectShape;
    };
  };
  export type Payload =
    Prisma.community_platform_commentsGetPayload<SelectShape>;
  export function select(): SelectShape {
    return {
      select: {
        id: true,
        content: true,
        vote_score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: CommunityPlatformMemberAtSummaryTransformer.select(),
        parentComment: CommunityPlatformCommentAtSummaryTransformer.select(),
        replies: select(),
      },
    } satisfies Prisma.community_platform_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformComment> {
    return {
      id: input.id,
      content: input.content,
      voteScore: input.vote_score,
      author: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      parentComment: input.parentComment
        ? await CommunityPlatformCommentAtSummaryTransformer.transform(
            input.parentComment,
          )
        : null,
      replies: await ArrayUtil.asyncMap(
        input.replies,
        CommunityPlatformCommentTransformer.transform,
      ),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
