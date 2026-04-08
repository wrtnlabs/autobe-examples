import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
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
                reddit_clone_file_id: true,
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
            file: {
              select: {
                thumbnails: {
                  select: {
                    thumbnail_path: true,
                  },
                },
              },
            },
          },
        },
      },
    } satisfies Prisma.reddit_clone_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditClonePost.ISummary> {
    const contentPreview =
      input.type === "text"
        ? (input.postTextContent?.body ?? "").slice(0, 200)
        : input.type === "link"
          ? (() => {
              const url = input.link?.url;
              if (!url) return "";
              try {
                return new URL(url).hostname;
              } catch {
                return url;
              }
            })()
          : input.type === "image"
            ? (input.image?.file?.thumbnails?.[0]?.thumbnail_path ?? "")
            : "";
    return {
      id: input.id,
      title: input.title,
      type: input.type as "text" | "link" | "image",
      voteScore: input.vote_score satisfies number as number,
      commentCount: input.comment_count satisfies number as number,
      createdAt: input.created_at.toISOString(),
      author: {
        id: input.author.id,
        username: input.author.username,
      } satisfies IRedditCloneMember.ISummary,
      community: {
        id: input.community.id,
        name: input.community.name,
        description: input.community.description,
        subscriberCount: input.community
          .subscriber_count satisfies number as number,
        owner: {
          id: input.community.member.id,
          username: input.community.member.username,
        } satisfies IRedditCloneMember.ISummary,
        icon: input.community.icon?.reddit_clone_file_id ?? null,
      } satisfies IRedditCloneCommunity.ISummary,
      contentPreview,
    } satisfies IRedditClonePost.ISummary;
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