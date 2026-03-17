import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformCommentAtSummaryTransformer {
  export type Payload = Prisma.community_platform_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select(): {
    select: {
      id: true;
      content: true;
      vote_score: true;
      created_at: true;
      author: ReturnType<
        typeof CommunityPlatformMemberAtSummaryTransformer.select
      >;
      replies: ReturnType<typeof select>;
    };
  } {
    return {
      select: {
        id: true,
        content: true,
        vote_score: true,
        created_at: true,
        author: CommunityPlatformMemberAtSummaryTransformer.select(),
        replies: select(),
      },
    } satisfies Prisma.community_platform_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformComment.ISummary> {
    return {
      id: input.id,
      content: input.content,
      author: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      vote_score: input.vote_score,
      created_at: toISOStringSafe(input.created_at),
      replies: await ArrayUtil.asyncMap(
        input.replies,
        CommunityPlatformCommentAtSummaryTransformer.transform,
      ),
    };
  }
}
