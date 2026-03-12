import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";
import { RedditClonePostImageTransformer } from "./RedditClonePostImageTransformer";

export namespace RedditClonePostTransformer {
  export type Payload = Prisma.reddit_clone_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content: true,
        post_type: true,
        score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: RedditCloneMemberAtSummaryTransformer.select(),
        community: RedditCloneCommunityAtSummaryTransformer.select(),
        images: RedditClonePostImageTransformer.select(),
        comments: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_commentsFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_postsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditClonePost> {
    return {
      id: input.id,
      title: input.title,
      content: input.content,
      post_type: typia.assert<"text" | "link" | "image">(input.post_type),
      score: input.score,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at != null ? toISOStringSafe(input.deleted_at) : null,
      author: await RedditCloneMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      images: await ArrayUtil.asyncMap(
        input.images,
        RedditClonePostImageTransformer.transform,
      ),
      comments_count: input.comments.length,
    };
  }
}
