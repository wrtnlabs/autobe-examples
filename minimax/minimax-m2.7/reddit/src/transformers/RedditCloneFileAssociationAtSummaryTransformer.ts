import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneFileAssociationAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_file_associationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        target_type: true,
        target_id: true,
        created_at: true,
        updated_at: true,
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
                        reddit_clone_file_id: true,
                        target_type: true,
                        target_id: true,
                        created_at: true,
                        updated_at: true,
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
                                created_at: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    } satisfies Prisma.reddit_clone_file_associationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneFileAssociation.ISummary> {
    return {
      id: input.id,
      target_type: input.target_type,
      target_id: input.target_id,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      file: {
        id: input.file.id,
        originalFilename: input.file.original_filename,
        mimeType: input.file.mime_type,
        fileSize: input.file.file_size,
        status: input.file.status,
        createdAt: toISOStringSafe(input.file.created_at),
        uploader: {
          id: input.file.uploader.id,
          username: input.file.uploader.username,
          created_at: toISOStringSafe(input.file.uploader.created_at),
          profile: input.file.uploader.profile
            ? {
                id: input.file.uploader.profile.id,
                display_name: input.file.uploader.profile.display_name,
                bio: input.file.uploader.profile.bio ?? undefined,
                avatar: input.file.uploader.profile.avatarFileAssociation
                  ? {
                      id: input.file.uploader.profile.avatarFileAssociation.id,
                      target_type:
                        input.file.uploader.profile.avatarFileAssociation
                          .target_type,
                      target_id:
                        input.file.uploader.profile.avatarFileAssociation
                          .target_id,
                      created_at: toISOStringSafe(
                        input.file.uploader.profile.avatarFileAssociation
                          .created_at,
                      ),
                      updated_at: toISOStringSafe(
                        input.file.uploader.profile.avatarFileAssociation
                          .updated_at,
                      ),
                      file: {
                        id: input.file.uploader.profile.avatarFileAssociation
                          .file.id,
                        originalFilename:
                          input.file.uploader.profile.avatarFileAssociation.file
                            .original_filename,
                        mimeType:
                          input.file.uploader.profile.avatarFileAssociation.file
                            .mime_type,
                        fileSize:
                          input.file.uploader.profile.avatarFileAssociation.file
                            .file_size,
                        status:
                          input.file.uploader.profile.avatarFileAssociation.file
                            .status,
                        createdAt: toISOStringSafe(
                          input.file.uploader.profile.avatarFileAssociation.file
                            .created_at,
                        ),
                        uploader: {
                          id: input.file.uploader.profile.avatarFileAssociation
                            .file.uploader.id,
                          username:
                            input.file.uploader.profile.avatarFileAssociation
                              .file.uploader.username,
                          created_at: toISOStringSafe(
                            input.file.uploader.profile.avatarFileAssociation
                              .file.uploader.created_at,
                          ),
                          profile: null as any,
                          karma_count: 0,
                        },
                      },
                    }
                  : undefined,
              }
            : null,
          karma_count: 0,
        },
      },
    };
  }
}
