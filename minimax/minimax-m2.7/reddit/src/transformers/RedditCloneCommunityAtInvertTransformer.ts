import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneCommunityAtInvertTransformer {
  export type Payload = Prisma.reddit_clone_communitiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        subscriber_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
            username: true,
          },
        },
        icon: {
          select: {
            id: true,
            created_at: true,
            community: {
              select: {
                id: true,
                name: true,
                description: true,
                subscriber_count: true,
                created_at: true,
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
            file: {
              select: {
                id: true,
                original_filename: true,
                mime_type: true,
                file_size: true,
                status: true,
                created_at: true,
                uploader: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
                thumbnails: {
                  select: {
                    id: true,
                    width: true,
                    height: true,
                    variant: true,
                    thumbnail_path: true,
                    created_at: true,
                  },
                },
              },
            },
          },
        },
        communityModerators: {
          select: {
            id: true,
          },
        },
        communityBans: {
          select: {
            id: true,
          },
        },
        communityReports: {
          select: {
            id: true,
          },
        },
        subscriptions: {
          select: {
            id: true,
          },
        },
        posts: {
          select: {
            id: true,
          },
        },
        moderators: {
          select: {
            id: true,
          },
        },
        moderatorSnapshots: {
          select: {
            id: true,
          },
        },
        bans: {
          select: {
            id: true,
          },
        },
        reports: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.reddit_clone_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommunity.IInvert> {
    if (!input.icon) {
      throw new Error(
        "RedditCloneCommunityAtInvertTransformer: icon is required but was null in database",
      );
    }
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      subscriberCount: input.subscriber_count,
      owner: {
        id: input.member.id,
        username: input.member.username,
      } satisfies IRedditCloneMember.ISummary,
      icon: {
        id: input.icon.id,
        createdAt: input.icon.created_at.toISOString(),
        community: {
          id: input.icon.community.id,
          name: input.icon.community.name,
          description: input.icon.community.description,
          subscriberCount: input.icon.community.subscriber_count,
          owner: {
            id: input.icon.community.member.id,
            username: input.icon.community.member.username,
          } satisfies IRedditCloneMember.ISummary,
          icon: input.icon.community.icon?.file?.url ?? undefined,
        } satisfies IRedditCloneCommunity.ISummary,
        file: {
          id: input.icon.file.id,
          originalFilename: input.icon.file.original_filename,
          mimeType: input.icon.file.mime_type,
          fileSize: input.icon.file.file_size,
          status: input.icon.file.status,
          createdAt: input.icon.file.created_at.toISOString(),
          uploader: {
            id: input.icon.file.uploader.id,
            username: input.icon.file.uploader.username,
          } satisfies IRedditCloneMember.ISummary,
          thumbnails: input.icon.file.thumbnails?.length
            ? await ArrayUtil.asyncMap(
                input.icon.file.thumbnails,
                async (t) => ({
                  id: t.id,
                  width: t.width,
                  height: t.height,
                  variant: t.variant,
                  thumbnailPath: t.thumbnail_path,
                  createdAt: t.created_at.toISOString(),
                }),
              )
            : undefined,
        } satisfies IRedditCloneFile.ISummary,
      } satisfies IRedditCloneCommunityIcon.IInvert,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    } satisfies IRedditCloneCommunity.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneCommunityAtInvertTransformer {
//       export type Payload = Prisma.reddit_clone_communitiesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             subscriber_count: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member: RedditCloneMemberAtSummaryTransformer.select(),
//             icon: RedditCloneCommunityIconAtInvertTransformer.select(),
//           },
//         } satisfies Prisma.reddit_clone_communitiesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneCommunity.IInvert> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   subscriberCount: {integer},
//   owner: await RedditCloneMemberAtSummaryTransformer.transform(input.member),
//   icon: await RedditCloneCommunityIconAtInvertTransformer.transform(input.icon),
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------