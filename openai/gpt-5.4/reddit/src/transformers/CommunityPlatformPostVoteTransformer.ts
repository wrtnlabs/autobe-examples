import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";

export namespace CommunityPlatformPostVoteTransformer {
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostVote> {
    return {
      id: input.id,
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      post: await CommunityPlatformPostAtSummaryTransformer.transform(
        input.post,
      ),
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
        post: CommunityPlatformPostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_post_votesFindManyArgs;
  }
  export type Payload = Prisma.community_platform_post_votesGetPayload<
    ReturnType<typeof select>
  >;
}
