import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneUserProfileAtSummaryTransformer } from "./RedditCloneUserProfileAtSummaryTransformer";

export namespace RedditClonePostTransformer {
  export type Payload = Prisma.reddit_clone_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        text_content: true,
        link_url: true,
        image_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        userProfile: RedditCloneUserProfileAtSummaryTransformer.select(),
        community: RedditCloneCommunityAtSummaryTransformer.select(),
        postVotes: {
          select: { vote_type: true },
        } satisfies Prisma.reddit_clone_post_votesFindManyArgs,
        snapshots: {
          select: {},
        } satisfies Prisma.reddit_clone_post_snapshotsFindManyArgs,
        comments: {
          select: { deleted_at: true },
        } satisfies Prisma.reddit_clone_commentsFindManyArgs,
        reports: {
          select: {},
        } satisfies Prisma.reddit_clone_reportsFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_postsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditClonePost> {
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      text_content: input.text_content,
      link_url: input.link_url,
      image_url: input.image_url,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at != null ? toISOStringSafe(input.deleted_at) : null,
      vote_score: input.postVotes.reduce(
        (sum, vote) => sum + Number(vote.vote_type),
        0,
      ),
      comment_count: input.comments.filter((c) => c.deleted_at === null).length,
      author: await RedditCloneUserProfileAtSummaryTransformer.transform(
        input.userProfile,
      ),
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    };
  }
}
