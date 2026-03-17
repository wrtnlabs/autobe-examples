import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

export namespace CommunityModeratorAtSummaryTransformer {
  export type Payload = Prisma.community_moderatorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        role: true,
        created_at: true,
        member: CommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityModerator.ISummary> {
    return {
      id: input.id,
      role: input.role,
      member: await CommunityMemberAtSummaryTransformer.transform(input.member),
      created_at: input.created_at.toISOString(),
    };
  }
}
