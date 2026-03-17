import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeAttachmentAtSummaryTransformer } from "./RedditLikeAttachmentAtSummaryTransformer";
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
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        owner: RedditLikeMemberAtSummaryTransformer.select(),
        iconAttachment: RedditLikeAttachmentAtSummaryTransformer.select(),
        _count: {
          select: {
            subscriptions: true,
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
      name: input.name,
      description: input.description,
      owner: await RedditLikeMemberAtSummaryTransformer.transform(input.owner),
      icon: input.iconAttachment
        ? await RedditLikeAttachmentAtSummaryTransformer.transform(
            input.iconAttachment,
          )
        : null,
      subscriber_count: input._count.subscriptions,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
