import { ICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaScore";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformKarmaScoreAtSummaryTransformer {
  export type Payload = Prisma.community_platform_karma_scoresGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        karma_score: true,
        created_at: true,
        updated_at: true,
        member: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_karma_scoresFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformKarmaScore.ISummary> {
    return {
      id: input.id,
      member: {},
      karma_score: input.karma_score,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
