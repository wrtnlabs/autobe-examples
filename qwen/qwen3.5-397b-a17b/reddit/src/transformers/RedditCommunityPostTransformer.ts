import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommunityAtSummaryTransformer } from "./RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityPostImageContentTransformer } from "./RedditCommunityPostImageContentTransformer";
import { RedditCommunityPostLinkContentTransformer } from "./RedditCommunityPostLinkContentTransformer";
import { RedditCommunityPostTextContentTransformer } from "./RedditCommunityPostTextContentTransformer";

export namespace RedditCommunityPostTransformer {
  export type Payload = Prisma.reddit_community_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: RedditCommunityMemberAtSummaryTransformer.select(),
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
        text: RedditCommunityPostTextContentTransformer.select(),
        link: RedditCommunityPostLinkContentTransformer.select(),
        image: RedditCommunityPostImageContentTransformer.select(),
        votes: {
          select: {
            value: true,
          },
        } satisfies Prisma.reddit_community_post_votesFindManyArgs,
        comments: {
          select: {
            deleted_at: true,
          },
        } satisfies Prisma.reddit_community_commentsFindManyArgs,
        reports: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_community_report_of_postsFindManyArgs,
      },
    } satisfies Prisma.reddit_community_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPost> {
    return {
      id: input.id,
      title: input.title,
      postType: input.post_type,
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      voteScore: input.votes.reduce((sum, vote) => sum + vote.value, 0),
      commentsCount: input.comments.filter((comment) => !comment.deleted_at)
        .length,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      content: await (async () => {
        if (input.post_type === "text" && input.text) {
          return await RedditCommunityPostTextContentTransformer.transform(
            input.text,
          );
        } else if (input.post_type === "link" && input.link) {
          return await RedditCommunityPostLinkContentTransformer.transform(
            input.link,
          );
        } else if (input.post_type === "image" && input.image) {
          return await RedditCommunityPostImageContentTransformer.transform(
            input.image,
          );
        }
        return undefined;
      })(),
    } satisfies IRedditCommunityPost;
  }
}
