import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikeCommunityTransformer {
  export type Payload = Prisma.reddit_like_communitiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        icon_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        owner: RedditLikeMemberAtSummaryTransformer.select(),
        posts: {
          select: {
            id: true,
            title: true,
          },
        },
        subscriptions: {
          select: {
            id: true,
            member: true,
          },
        },
        moderatorRoles: {
          select: {
            id: true,
            role: true,
          },
        },
        userBans: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.reddit_like_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunity> {
    return {
      id: input.id,
      member_id: input.owner.id,
      name: input.name,
      icon_url: input.icon_url ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      owner: await RedditLikeMemberAtSummaryTransformer.transform(input.owner),
    };
  }
}
