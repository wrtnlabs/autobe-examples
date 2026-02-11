import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityCommunityAtSummaryTransformer } from "./CommunityCommunityAtSummaryTransformer";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

export namespace CommunityModeratorTransformer {
  export type Payload = Prisma.community_moderatorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        is_owner: true,
        user: CommunityMemberAtSummaryTransformer.select(),
        community: CommunityCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityModerator> {
    return {
      id: input.id,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      is_owner: input.is_owner,
      user: await CommunityMemberAtSummaryTransformer.transform(input.user),
      community: await CommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    };
  }
}
