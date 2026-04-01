import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
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
        text: {
          select: {
            id: true,
            body: true,
          },
        } satisfies Prisma.reddit_community_post_textsFindManyArgs,
        link: {
          select: {
            id: true,
            url: true,
            domain_name: true,
          },
        } satisfies Prisma.reddit_community_post_linksFindManyArgs,
        images: {
          select: {
            file: {
              select: {
                file_path: true,
              },
            } satisfies Prisma.reddit_community_filesFindManyArgs,
          },
        } satisfies Prisma.reddit_community_file_of_postsFindManyArgs,
      },
    } satisfies Prisma.reddit_community_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPost> {
    const content = transformContent(input);
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type as IRedditCommunityPost["post_type"],
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
      content,
    };
  }
  function transformContent(input: Payload): IRedditCommunityPost.IContent {
    const postType = input.post_type;
    switch (postType) {
      case "text": {
        const text = input.text;
        if (!text) {
          throw new Error(
            `Text post ${input.id} has no associated text record`,
          );
        }
        return {
          post_type: "text" as const,
          body: text.body,
        };
      }
      case "link": {
        const link = input.link;
        if (!link) {
          throw new Error(
            `Link post ${input.id} has no associated link record`,
          );
        }
        return {
          post_type: "link" as const,
          url: link.url,
          domain_name: link.domain_name ?? "",
        };
      }
      case "image": {
        const images = input.images;
        if (!images || images.length === 0) {
          throw new Error(
            `Image post ${input.id} has no associated image files`,
          );
        }
        const fileUri = images[0].file.file_path;
        return {
          post_type: "image" as const,
          fileUri,
        };
      }
      default: {
        const exhaustiveCheck: string = postType;
        throw new Error(`Unknown post_type: ${exhaustiveCheck}`);
      }
    }
  }
}
