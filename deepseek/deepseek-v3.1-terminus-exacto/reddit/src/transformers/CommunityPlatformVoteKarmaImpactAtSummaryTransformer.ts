import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteKarmaImpact";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformVoteKarmaImpactAtSummaryTransformer {
  export type Payload = Prisma.community_platform_vote_karma_impactsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        karma_delta: true,
        created_at: true,
        updated_at: true,
        user: CommunityPlatformUserAtSummaryTransformer.select(),
        postKarmaImpact: true,
        commentKarmaImpact: true,
      },
    } satisfies Prisma.community_platform_vote_karma_impactsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformVoteKarmaImpact.ISummary> {
    return {
      id: input.id,
      karma_delta: input.karma_delta,
      created_at: input.created_at.toISOString(),
      user: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.user,
      ),
    };
  }
}
