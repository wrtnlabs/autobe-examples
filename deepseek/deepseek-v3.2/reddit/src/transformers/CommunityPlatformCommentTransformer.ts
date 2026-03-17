import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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

export namespace CommunityPlatformCommentTransformer {
  export type Payload = Prisma.community_platform_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
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
    } satisfies Prisma.community_platform_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformComment> {
    return {
      id: input.id,
      content: input.content,
      vote_score: input.vote_score,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      author: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      post: await CommunityPlatformPostAtSummaryTransformer.transform(
        input.post,
      ),
      parent: input.parent
        ? ({
            id: input.parent.id,
            content: input.parent.content,
            voteScore: input.parent.vote_score,
            createdAt: input.parent.created_at.toISOString(),
            updatedAt: input.parent.updated_at.toISOString(),
            deletedAt: input.parent.deleted_at
              ? input.parent.deleted_at.toISOString()
              : null,
            author: await CommunityPlatformMemberAtSummaryTransformer.transform(
              input.parent.author,
            ),
            post: await CommunityPlatformPostAtSummaryTransformer.transform(
              input.parent.post,
            ),
          } satisfies ICommunityPlatformComment.ISummary)
        : null,
    };
  }
}
