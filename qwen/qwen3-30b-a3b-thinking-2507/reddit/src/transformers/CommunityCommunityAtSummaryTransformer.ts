import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

export namespace CommunityCommunityAtSummaryTransformer {
  export type Payload = Prisma.community_communitiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        icon_url: true,
        created_at: true,
        owner: { select: CommunityMemberAtSummaryTransformer.select() },
        deleted_at: true,
      },
    } satisfies Prisma.community_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityCommunity.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      icon_url: input.icon_url ?? undefined,
      owner: await CommunityMemberAtSummaryTransformer.transform(input.owner),
      created_at: toISOStringSafe(input.created_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
