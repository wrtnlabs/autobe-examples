import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityBanAtSummaryTransformer } from "./RedditCloneCommunityBanAtSummaryTransformer";
import { RedditCloneMemberSessionAtSummaryTransformer } from "./RedditCloneMemberSessionAtSummaryTransformer";

export namespace RedditClonePostLinkTransformer {
  export type Payload = Prisma.reddit_clone_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        type: true,
        vote_score: true,
        comment_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: RedditCloneMemberSessionAtSummaryTransformer.select(),
        community: RedditCloneCommunityBanAtSummaryTransformer.select(),
        postTextContent: {
          select: {
            body: true,
          },
        } satisfies Prisma.reddit_clone_post_text_contentsFindManyArgs,
        link: {
          select: {
            url: true,
          },
        } satisfies Prisma.reddit_clone_post_linksFindManyArgs,
        image: {
          select: {
            reddit_clone_file_id: true,
          },
        } satisfies Prisma.reddit_clone_post_imagesFindManyArgs,
        comments: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_commentsFindManyArgs,
        postVotes: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_post_votesFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditClonePostLink> {
    return {
      id: input.id,
      title: input.title,
      type: input.type,
      vote_score: input.vote_score,
      comment_count: input.comment_count,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? undefined,
      author: await RedditCloneMemberSessionAtSummaryTransformer.transform(
        input.author,
      ),
      community: await RedditCloneCommunityBanAtSummaryTransformer.transform(
        input.community,
      ),
      textBody: input.postTextContent?.body,
      linkUrl: input.link?.url,
      imageFileId: input.image?.reddit_clone_file_id,
    };
  }
}
