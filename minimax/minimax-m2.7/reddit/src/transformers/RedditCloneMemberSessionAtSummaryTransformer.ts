import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneMemberSessionAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select(): {
    select: {
      id: true;
      username: true;
      created_at: true;
      profile: {
        select: {
          id: true;
          display_name: true;
          bio: true;
          created_at: true;
          updated_at: true;
          avatarFileAssociation: {
            select: {
              id: true;
              target_type: true;
              target_id: true;
              created_at: true;
              updated_at: true;
              reddit_clone_file: {
                select: {
                  id: true;
                  original_filename: true;
                  mime_type: true;
                  file_size: true;
                  status: true;
                  created_at: true;
                  uploader: {
                    select: {
                      id: true;
                      username: true;
                      created_at: true;
                    };
                  };
                };
              };
            };
          };
        };
      };
      karma: {
        select: {
          karma_score: true;
        };
      };
    };
  } {
    return {
      select: {
        id: true,
        username: true,
        created_at: true,
        profile: {
          select: {
            id: true,
            display_name: true,
            bio: true,
            created_at: true,
            updated_at: true,
            avatarFileAssociation: {
              select: {
                id: true,
                target_type: true,
                target_id: true,
                created_at: true,
                updated_at: true,
                reddit_clone_file: {
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
                        created_at: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        karma: {
          select: {
            karma_score: true,
          },
        },
      },
    };
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneMemberSession.ISummary> {
    return {
      id: input.id,
      username: input.username,
      created_at: toISOStringSafe(input.created_at),
      profile: input.profile
        ? {
            id: input.profile.id,
            display_name: input.profile.display_name,
            bio: input.profile.bio ?? undefined,
            avatar: input.profile.avatarFileAssociation
              ? {
                  id: input.profile.avatarFileAssociation.id,
                  target_type: input.profile.avatarFileAssociation.target_type,
                  target_id: input.profile.avatarFileAssociation.target_id,
                  created_at: toISOStringSafe(
                    input.profile.avatarFileAssociation.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    input.profile.avatarFileAssociation.updated_at,
                  ),
                  file: {
                    id: input.profile.avatarFileAssociation.reddit_clone_file
                      .id,
                    originalFilename:
                      input.profile.avatarFileAssociation.reddit_clone_file
                        .original_filename,
                    mimeType:
                      input.profile.avatarFileAssociation.reddit_clone_file
                        .mime_type,
                    fileSize:
                      input.profile.avatarFileAssociation.reddit_clone_file
                        .file_size,
                    status:
                      input.profile.avatarFileAssociation.reddit_clone_file
                        .status,
                    createdAt: toISOStringSafe(
                      input.profile.avatarFileAssociation.reddit_clone_file
                        .created_at,
                    ),
                    uploader: {
                      id: input.profile.avatarFileAssociation.reddit_clone_file
                        .uploader.id,
                      username:
                        input.profile.avatarFileAssociation.reddit_clone_file
                          .uploader.username,
                      created_at: toISOStringSafe(
                        input.profile.avatarFileAssociation.reddit_clone_file
                          .uploader.created_at,
                      ),
                    },
                  },
                }
              : null,
          }
        : null,
      karma_count: input.karma?.karma_score ?? 0,
    };
  }
}
