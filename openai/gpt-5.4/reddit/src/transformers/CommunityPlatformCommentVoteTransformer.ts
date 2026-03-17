import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformCommentVoteTransformer {
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommentVote> {
    return {
      id: input.id,
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      comment: {} satisfies ICommunityPlatformComment.ISummary,
      direction: input.direction,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        direction: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
        comment: {
          select: {},
        } satisfies Prisma.community_platform_commentsFindManyArgs,
      },
    } satisfies Prisma.community_platform_comment_votesFindManyArgs;
  }
  export type Payload = Prisma.community_platform_comment_votesGetPayload<
    ReturnType<typeof select>
  >;
}
