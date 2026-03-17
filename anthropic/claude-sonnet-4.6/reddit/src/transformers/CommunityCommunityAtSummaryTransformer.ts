import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

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
        _count: {
          select: {
            subscriptions: {
              where: {
                deleted_at: null,
              },
            },
          },
        },
      },
    } satisfies Prisma.community_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityCommunity.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      iconUrl: input.icon_url,
      subscriberCount: input._count.subscriptions,
      createdAt: input.created_at.toISOString(),
    };
  }
}
