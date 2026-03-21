import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAuthMemberLogin(props: {
  ip: string;
  body: IRedditCloneMemberSession.ILogin;
}): Promise<IRedditCloneMemberSession.IAuthorized> {
  // 1. Find member by email with password_hash
  const member = await MyGlobal.prisma.reddit_clone_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      username: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      profile: {
        select: {
          id: true,
          display_name: true,
          bio: true,
          reddit_clone_file_association_id: true,
          avatarFileAssociation: {
            select: {
              id: true,
              target_id: true,
              target_type: true,
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
                  uploader_id: true,
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
      userKarmas: {
        select: {
          id: true,
          reason: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          expires_at: true,
          reddit_clone_community_id: true,
          reddit_clone_user_id: true,
          issued_by_reddit_clone_user_id: true,
          community: {
            select: {
              id: true,
              name: true,
              description: true,
              subscriber_count: true,
              created_at: true,
              member_id: true,
              owner: {
                select: {
                  id: true,
                  username: true,
                  created_at: true,
                  profile: {
                    select: {
                      id: true,
                      display_name: true,
                      bio: true,
                    },
                  },
                },
              },
            },
          },
          bannedUser: {
            select: {
              id: true,
              username: true,
              created_at: true,
              profile: {
                select: {
                  id: true,
                  display_name: true,
                  bio: true,
                },
              },
            },
          },
          issuer: {
            select: {
              id: true,
              username: true,
              created_at: true,
              profile: {
                select: {
                  id: true,
                  display_name: true,
                  bio: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Create session with JWT tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.reddit_clone_member_sessions.create({
    data: {
      id: sessionId,
      reddit_clone_member_id: member.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  // 4. Build profile summary
  const profileSummary: IRedditCloneUserProfile.ISummary = {
    id: member.profile.id,
    display_name: member.profile.display_name,
    bio: member.profile.bio,
    avatar: member.profile.avatarFileAssociation
      ? {
          id: member.profile.avatarFileAssociation.id,
          target_id: member.profile.avatarFileAssociation.target_id,
          target_type: member.profile.avatarFileAssociation.target_type,
          created_at:
            member.profile.avatarFileAssociation.created_at.toISOString(),
          updated_at:
            member.profile.avatarFileAssociation.updated_at.toISOString(),
          file: {
            id: member.profile.avatarFileAssociation.file.id,
            originalFilename:
              member.profile.avatarFileAssociation.file.original_filename,
            mimeType: member.profile.avatarFileAssociation.file.mime_type,
            fileSize: member.profile.avatarFileAssociation.file.file_size,
            status: member.profile.avatarFileAssociation.file.status,
            createdAt:
              member.profile.avatarFileAssociation.file.created_at.toISOString(),
            uploader: {
              id: member.profile.avatarFileAssociation.file.uploader.id,
              username:
                member.profile.avatarFileAssociation.file.uploader.username,
              created_at:
                member.profile.avatarFileAssociation.file.uploader.created_at.toISOString(),
              profile: {
                id: member.profile.avatarFileAssociation.file.uploader.profile
                  .id,
                display_name:
                  member.profile.avatarFileAssociation.file.uploader.profile
                    .display_name,
                bio: member.profile.avatarFileAssociation.file.uploader.profile
                  .bio,
              },
            },
          },
        }
      : null,
  };
  // 5. Build karma response - if user has karma records, use first one; otherwise create empty karma
  const karmaResponse: IRedditCloneUserKarma =
    member.userKarmas.length > 0
      ? {
          id: member.userKarmas[0].id,
          reason: member.userKarmas[0].reason,
          created_at: member.userKarmas[0].created_at.toISOString(),
          updated_at: member.userKarmas[0].updated_at.toISOString(),
          deleted_at: member.userKarmas[0].deleted_at?.toISOString() ?? null,
          expires_at: member.userKarmas[0].expires_at?.toISOString() ?? null,
          community: {
            id: member.userKarmas[0].community.id,
            name: member.userKarmas[0].community.name,
            description: member.userKarmas[0].community.description,
            subscriber_count: member.userKarmas[0].community.subscriber_count,
            created_at: member.userKarmas[0].community.created_at.toISOString(),
            owner: {
              id: member.userKarmas[0].community.owner.id,
              username: member.userKarmas[0].community.owner.username,
              created_at:
                member.userKarmas[0].community.owner.created_at.toISOString(),
              profile: {
                id: member.userKarmas[0].community.owner.profile.id,
                display_name:
                  member.userKarmas[0].community.owner.profile.display_name,
                bio: member.userKarmas[0].community.owner.profile.bio,
              },
            },
          },
          bannedUser: {
            id: member.userKarmas[0].bannedUser.id,
            username: member.userKarmas[0].bannedUser.username,
            created_at:
              member.userKarmas[0].bannedUser.created_at.toISOString(),
            profile: {
              id: member.userKarmas[0].bannedUser.profile.id,
              display_name:
                member.userKarmas[0].bannedUser.profile.display_name,
              bio: member.userKarmas[0].bannedUser.profile.bio,
            },
          },
          issuer: {
            id: member.userKarmas[0].issuer.id,
            username: member.userKarmas[0].issuer.username,
            created_at: member.userKarmas[0].issuer.created_at.toISOString(),
            profile: {
              id: member.userKarmas[0].issuer.profile.id,
              display_name: member.userKarmas[0].issuer.profile.display_name,
              bio: member.userKarmas[0].issuer.profile.bio,
            },
          },
        }
      : {
          id: v4() as string & tags.Format<"uuid">,
          reason: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
          expires_at: null,
          community: {
            id: v4() as string & tags.Format<"uuid">,
            name: "",
            description: "",
            subscriber_count: 0,
            created_at: new Date().toISOString(),
            owner: {
              id: member.id,
              username: member.username,
              created_at: member.created_at.toISOString(),
              profile: {
                id: member.profile.id,
                display_name: member.profile.display_name,
                bio: member.profile.bio,
              },
            },
          },
          bannedUser: {
            id: member.id,
            username: member.username,
            created_at: member.created_at.toISOString(),
            profile: {
              id: member.profile.id,
              display_name: member.profile.display_name,
              bio: member.profile.bio,
            },
          },
          issuer: {
            id: member.id,
            username: member.username,
            created_at: member.created_at.toISOString(),
            profile: {
              id: member.profile.id,
              display_name: member.profile.display_name,
              bio: member.profile.bio,
            },
          },
        };
  // 6. Build and return authorized response
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  return {
    id: member.id,
    email: member.email,
    username: member.username,
    created_at: member.created_at.toISOString(),
    updated_at: member.updated_at.toISOString(),
    deleted_at: member.deleted_at?.toISOString() ?? null,
    profile: profileSummary,
    karma: karmaResponse,
    token,
  };
}
