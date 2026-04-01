import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeAttachmentAtSummaryTransformer } from "./RedditLikeAttachmentAtSummaryTransformer";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikeCommunityAtSummaryTransformer {
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
        subscriptions: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_like_community_subscriptionsFindManyArgs,
        moderators: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_like_moderatorsFindManyArgs,
        attachmentReferences: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_like_attachment_reference_of_communitiesFindManyArgs,
        posts: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_like_postsFindManyArgs,
        reports: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_like_reportsFindManyArgs,
      },
    } satisfies Prisma.reddit_like_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunity.ISummary> {
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
      subscriberCount: input.subscriptions.length,
      createdAt: input.created_at.toISOString(),
    };
  }
}
