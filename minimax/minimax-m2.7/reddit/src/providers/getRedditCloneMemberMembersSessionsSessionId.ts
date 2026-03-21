import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneMemberMembersSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneMemberSession> {
  const session =
    await MyGlobal.prisma.reddit_clone_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      select: {
        id: true,
        reddit_clone_member_id: true,
        member: {
          select: {
            id: true,
            email: true,
            username: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            profile: {
              select: {
                id: true,
                display_name: true,
                bio: true,
                created_at: true,
                updated_at: true,
                member: {
                  select: {
                    id: true,
                    username: true,
                    created_at: true,
                  },
                },
                avatarFileAssociation: {
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
                id: true,
                karma_score: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        },
      } satisfies Prisma.reddit_clone_member_sessionsSelect,
    });
  if (session.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const member = session.member;
  // Build synthetic ISummary for profile when profile is null
  const syntheticProfileSummary: IRedditCloneUserProfile.ISummary = {
    id: member.id as string & tags.Format<"uuid">,
    display_name: member.username,
    bio: null,
    avatar: undefined,
  };
  // Helper to build owner ISummary
  const buildOwnerSummary = (): IRedditCloneMemberSession.ISummary => ({
    id: member.id,
    username: member.username,
    created_at: toISOStringSafe(member.created_at),
    profile: syntheticProfileSummary,
    karma_count: member.karma?.karma_score ?? 0,
  });
  // Build full IRedditCloneUserProfile when profile is null
  const syntheticProfile: IRedditCloneUserProfile = {
    id: member.id as string & tags.Format<"uuid">,
    display_name: member.username,
    bio: null,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    owner: buildOwnerSummary(),
    avatar: null,
  };
  return {
    id: member.id,
    email: member.email,
    username: member.username,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    profile: member.profile
      ? {
          id: member.profile.id,
          display_name: member.profile.display_name,
          bio: member.profile.bio,
          created_at: toISOStringSafe(member.profile.created_at),
          updated_at: toISOStringSafe(member.profile.updated_at),
          owner: {
            id: member.profile.member.id,
            username: member.profile.member.username,
            created_at: toISOStringSafe(member.profile.member.created_at),
            profile: {
              id: member.profile.id,
              display_name: member.profile.display_name,
              bio: member.profile.bio,
              avatar: member.profile.avatarFileAssociation
                ? {
                    id: member.profile.avatarFileAssociation.id,
                    created_at: toISOStringSafe(
                      member.profile.avatarFileAssociation.created_at,
                    ),
                    updated_at: toISOStringSafe(
                      member.profile.avatarFileAssociation.updated_at,
                    ),
                    target_id: member.profile.avatarFileAssociation.target_id,
                    target_type:
                      member.profile.avatarFileAssociation.target_type,
                    file: {
                      id: member.profile.avatarFileAssociation.file.id,
                      originalFilename:
                        member.profile.avatarFileAssociation.file
                          .original_filename,
                      mimeType:
                        member.profile.avatarFileAssociation.file.mime_type,
                      fileSize:
                        member.profile.avatarFileAssociation.file.file_size,
                      status: member.profile.avatarFileAssociation.file.status,
                      createdAt: toISOStringSafe(
                        member.profile.avatarFileAssociation.file.created_at,
                      ),
                      uploader: {
                        id: member.profile.avatarFileAssociation.file.uploader
                          .id,
                        username:
                          member.profile.avatarFileAssociation.file.uploader
                            .username,
                        created_at: toISOStringSafe(
                          member.profile.avatarFileAssociation.file.uploader
                            .created_at,
                        ),
                      },
                    },
                  }
                : undefined,
            },
            karma_count: member.karma?.karma_score ?? 0,
          },
          avatar: member.profile.avatarFileAssociation
            ? {
                id: member.profile.avatarFileAssociation.id,
                created_at: toISOStringSafe(
                  member.profile.avatarFileAssociation.created_at,
                ),
                updated_at: toISOStringSafe(
                  member.profile.avatarFileAssociation.updated_at,
                ),
                target_id: member.profile.avatarFileAssociation.target_id,
                target_type: member.profile.avatarFileAssociation.target_type,
                file: {
                  id: member.profile.avatarFileAssociation.file.id,
                  originalFilename:
                    member.profile.avatarFileAssociation.file.original_filename,
                  mimeType: member.profile.avatarFileAssociation.file.mime_type,
                  fileSize: member.profile.avatarFileAssociation.file.file_size,
                  status: member.profile.avatarFileAssociation.file.status,
                  createdAt: toISOStringSafe(
                    member.profile.avatarFileAssociation.file.created_at,
                  ),
                  uploader: {
                    id: member.profile.avatarFileAssociation.file.uploader.id,
                    username:
                      member.profile.avatarFileAssociation.file.uploader
                        .username,
                    created_at: toISOStringSafe(
                      member.profile.avatarFileAssociation.file.uploader
                        .created_at,
                    ),
                  },
                },
              }
            : null,
        }
      : syntheticProfile,
    karma: {
      id: member.karma?.id ?? member.id,
      reason: "karma",
      created_at: member.karma?.created_at
        ? toISOStringSafe(member.karma.created_at)
        : toISOStringSafe(member.created_at),
      updated_at: member.karma?.updated_at
        ? toISOStringSafe(member.karma.updated_at)
        : toISOStringSafe(member.updated_at),
      deleted_at: null,
      expires_at: null,
      community: {
        id: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
        name: "system",
        description: "System karma aggregation",
        subscriber_count: 0,
        created_at: toISOStringSafe(member.created_at),
        owner: buildOwnerSummary(),
      },
      bannedUser: buildOwnerSummary(),
      issuer: buildOwnerSummary(),
    },
  };
}
