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
        is_owner: true,
        created_at: true,
        updated_at: true,
        user: CommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityModerator.ISummary> {
    return {
      id: input.id,
      is_owner: input.is_owner,
      user: await CommunityMemberAtSummaryTransformer.transform(input.user),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
