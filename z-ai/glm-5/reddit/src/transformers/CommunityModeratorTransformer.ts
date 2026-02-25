import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

export namespace CommunityModeratorTransformer {
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
        member: CommunityMemberAtSummaryTransformer.select(),
        appointer: CommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityModerator> {
    return {
      id: input.id,
      is_owner: input.is_owner,
      created_at: input.created_at.toISOString(),
      member: await CommunityMemberAtSummaryTransformer.transform(input.member),
      appointer: input.appointer
        ? await CommunityMemberAtSummaryTransformer.transform(input.appointer)
        : null,
    };
  }
}
