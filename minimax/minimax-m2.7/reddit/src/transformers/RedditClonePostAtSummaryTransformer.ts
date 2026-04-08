import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditClonePostAtSummaryTransformer {
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
        author: {
          select: {
            id: true,
            username: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            subscriber_count: true,
            member: {
              select: {
                id: true,
                username: true,
              },
            },
            icon: {
              select: {
                file: {
                  select: {
                    url: true,
                  },
                },
              },
            },
          },
        },
        postTextContent: {
          select: {
            body: true,
          },
        },
        link: {
          select: {
            url: true,
          },
        },
        image: {
          select: {
            reddit_clone_file_id: true,
          },
        },
        comments: true,
        postVotes: true,
      },
    } satisfies Prisma.reddit_clone_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditClonePost.ISummary> {
    return {
      id: input.id,
      title: input.title,
      type: input.type as "text" | "link" | "image",
      voteScore: input.vote_score,
      commentCount: input.comment_count,
      createdAt: toISOStringSafe(input.created_at),
      author: {
        id: input.author.id,
        username: input.author.username,
      } satisfies IRedditCloneMember.ISummary,
      community: {
        id: input.community.id,
        name: input.community.name,
        description: input.community.description,
        subscriberCount: input.community.subscriber_count,
        owner: {
          id: input.community.member.id,
          username: input.community.member.username,
        } satisfies IRedditCloneMember.ISummary,
        icon: input.community.icon?.file?.url ?? undefined,
      } satisfies IRedditCloneCommunity.ISummary,
      contentPreview: getContentPreview(input),
    } satisfies IRedditClonePost.ISummary;
  }
  function getContentPreview(input: Payload): string {
    switch (input.type) {
      case "text":
        return input.postTextContent?.body?.substring(0, 200) ?? "";
      case "image":
        return input.image?.reddit_clone_file_id ?? "";
      case "link":
        try {
          return input.link?.url ? new URL(input.link.url).hostname : "";
        } catch {
          return input.link?.url ?? "";
        }
      default:
        return "";
    }
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditClonePostAtSummaryTransformer {
//       export type Payload = Prisma.reddit_clone_postsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             title: true,
//             type: true,
//             vote_score: true,
//             comment_count: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             author: RedditCloneMemberAtSummaryTransformer.select(),
//             community: RedditCloneCommunityAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_clone_postsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditClonePost.ISummary> {
//         return {
//   author: await RedditCloneMemberAtSummaryTransformer.transform(input.author),
//   commentCount: {integer},
//   community: await RedditCloneCommunityAtSummaryTransformer.transform(input.community),
//   contentPreview: {string | string | string},
//   createdAt: {string},
//   id: {string},
//   title: {string},
//   type: {"text" | "link" | "image"},
//   voteScore: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------