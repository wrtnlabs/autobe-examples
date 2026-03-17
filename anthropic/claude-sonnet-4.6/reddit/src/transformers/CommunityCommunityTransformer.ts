import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

export namespace CommunityCommunityTransformer {
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
        updated_at: true,
        deleted_at: true,
        owner: CommunityMemberAtSummaryTransformer.select(),
        subscriptions: {
          select: {
            deleted_at: true,
          },
        } satisfies Prisma.community_subscriptionsFindManyArgs,
      },
    } satisfies Prisma.community_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityCommunity> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      icon_url: input.icon_url,
      owner: await CommunityMemberAtSummaryTransformer.transform(input.owner),
      subscriber_count: input.subscriptions.filter((s) => s.deleted_at === null)
        .length,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
