import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditMemberAtSummaryTransformer } from "./RedditMemberAtSummaryTransformer";

export namespace RedditCommunityTransformer {
  export type Payload = Prisma.reddit_communitiesGetPayload<
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
        owner: RedditMemberAtSummaryTransformer.select(),
        _count: true,
        posts: true,
        bans: true,
      },
    } satisfies Prisma.reddit_communitiesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditCommunity> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      icon_url: input.icon_url,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      owner: await RedditMemberAtSummaryTransformer.transform(input.owner),
      subscriber_count: input._count.subscriptions,
    };
  }
}
