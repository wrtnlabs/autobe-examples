import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommunityAtSummaryTransformer } from "./RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

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
        vote_score: true,
        comment_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: RedditCommunityMemberAtSummaryTransformer.select(),
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
        text: true,
        link: true,
        images: {
          select: {
            file: {
              select: { id: true },
            },
          },
        },
      },
    } satisfies Prisma.reddit_community_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPost> {
    const content = (() => {
      switch (input.post_type) {
        case "text":
          return {
            post_type: input.post_type,
            body: input.text?.body ?? "",
          } as IRedditCommunityPost.IContent;
        case "link":
          return {
            post_type: input.post_type,
            url: input.link?.url ?? "",
            domain_name: input.link?.domain_name ?? "",
          } as IRedditCommunityPost.IContent;
        case "image":
          const firstImage = input.images?.[0];
          const fileUri = firstImage?.file?.id
            ? `/files/${firstImage.file.id}`
            : "";
          return {
            post_type: input.post_type,
            fileUri: fileUri,
          } as IRedditCommunityPost.IContent;
        default:
          return {
            post_type: input.post_type,
          } as IRedditCommunityPost.IContent;
      }
    })();
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type as "text" | "link" | "image",
      vote_score: input.vote_score,
      comment_count: input.comment_count,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      content: content,
    };
  }
}
