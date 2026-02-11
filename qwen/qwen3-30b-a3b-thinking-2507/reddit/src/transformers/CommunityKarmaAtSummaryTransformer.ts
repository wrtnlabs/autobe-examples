import { ICommunityKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarma";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

export namespace CommunityKarmaAtSummaryTransformer {
  export type Payload = Prisma.community_karmasGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        score: true,
        created_at: true,
        updated_at: true,
        user: { select: CommunityMemberAtSummaryTransformer.select() },
        deleted_at: true,
      },
    } satisfies Prisma.community_karmasFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityKarma.ISummary> {
    return {
      id: input.id,
      score: input.score,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      user: await CommunityMemberAtSummaryTransformer.transform(input.user),
    };
  }
}
