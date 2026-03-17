import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
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

export async function putRedditCommunityMemberProfile(props: {
  member: MemberPayload;
  body: IRedditCommunityUserProfile.IUpdate;
}): Promise<IRedditCommunityUserProfile> {
  const memberId = props.member.id;
  const sessionId = props.member.session_id;
  // Verify session is valid for this member
  const session =
    await MyGlobal.prisma.reddit_community_member_sessions.findFirst({
      where: {
        id: sessionId,
        member_id: memberId,
        expired_at: {
          gte: new Date(),
        },
      },
    });
  if (!session) {
    throw new HttpException("Session expired", 401);
  }
  // Verify member account exists and is not deleted
  const member = await MyGlobal.prisma.reddit_community_members.findFirst({
    where: {
      id: memberId,
      deleted_at: null,
    },
  });
  if (!member) {
    throw new HttpException("Member not found", 404);
  }
  // Find the profile belonging to this member's user account
  const profile =
    await MyGlobal.prisma.reddit_community_user_profiles.findFirst({
      where: {
        reddit_community_user_id: member.id,
        deleted_at: null,
      },
    });
  if (!profile) {
    throw new HttpException("Profile not found", 404);
  }
  // Validate display name if provided - must not be empty and must be unique
  let displayName: string | undefined = props.body.display_name;
  if (displayName !== undefined) {
    // Check uniqueness - find any profile with this name other than this one
    const existingProfile =
      await MyGlobal.prisma.reddit_community_user_profiles.findFirst({
        where: {
          display_name: displayName,
          id: {
            not: profile.id,
          },
          deleted_at: null,
        },
      });
    if (existingProfile) {
      throw new HttpException("Display name already in use", 409);
    }
  }
  // Validate avatar if provided - must exist and belong to this member
  let avatarUrlId: (string & tags.Format<"uuid">) | null | undefined =
    props.body.avatar_image_url_id;
  if (props.body.avatar_image_url_id !== undefined) {
    const avatarId = props.body.avatar_image_url_id;
    if (avatarId === null) {
      // Explicitly removing avatar
      avatarUrlId = null;
    } else {
      // Verify avatar belongs to this member via file_of_users relationship
      const fileOfUser =
        await MyGlobal.prisma.reddit_community_file_of_users.findFirst({
          where: {
            reddit_community_member_id: member.id,
            reddit_community_file_id: avatarId,
          },
        });
      if (!fileOfUser) {
        throw new HttpException("Avatar does not belong to you", 400);
      }
      avatarUrlId = avatarId;
    }
  }
  // Build update data - only include fields that were provided
  const updateData: {
    display_name?: string;
    bio?: string | null;
    avatar_image_url_id?: (string & tags.Format<"uuid">) | null;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.display_name !== undefined) {
    updateData.display_name = displayName!;
  }
  if (props.body.bio !== undefined) {
    updateData.bio = props.body.bio;
  }
  if (props.body.avatar_image_url_id !== undefined) {
    updateData.avatar_image_url_id = avatarUrlId!;
  }
  // Update profile atomically
  const updatedProfile =
    await MyGlobal.prisma.reddit_community_user_profiles.update({
      where: {
        id: profile.id,
      },
      data: updateData,
    });
  // Fetch member details for user summary
  const memberRecord =
    await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow({
      where: {
        id: member.id,
      },
      select: {
        id: true,
        username: true,
        created_at: true,
      },
    });
  // Fetch karma score for member
  const karmaRecord =
    await MyGlobal.prisma.reddit_community_user_karmas.findFirst({
      where: {
        reddit_community_member_id: member.id,
      },
      select: {
        id: true,
        reddit_community_member_id: true,
        current_score: true,
        created_at: true,
        updated_at: true,
      },
    });
  const karma: IRedditCommunityUserKarma = karmaRecord
    ? {
        id: karmaRecord.id,
        reddit_member_id: karmaRecord.reddit_community_member_id,
        current_score: karmaRecord.current_score,
        created_at: toISOStringSafe(karmaRecord.created_at),
        updated_at: toISOStringSafe(karmaRecord.updated_at),
      }
    : {
        id: v4() as string & tags.Format<"uuid">,
        reddit_member_id: member.id,
        current_score: 0,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      };
  // Build user summary
  const userSummary: IRedditCommunityMember.ISummary = {
    id: memberRecord.id,
    username: memberRecord.username,
    created_at: toISOStringSafe(memberRecord.created_at),
    profile: undefined,
    karma: karma.current_score,
  };
  // Empty pagination for posts and comments (requires separate pagination logic)
  const postsPagination: IPageIRedditCommunityPost.ISummary = {
    pagination: {
      current: 1,
      limit: 10,
      records: 0,
      pages: 0,
    },
    data: [],
  };
  const commentsPagination: IPageIRedditCommunityComment.ISummary = {
    pagination: {
      current: 1,
      limit: 10,
      records: 0,
      pages: 0,
    },
    data: [],
  };
  // Build and return complete profile response
  const result: IRedditCommunityUserProfile = {
    id: updatedProfile.id,
    user: userSummary,
    avatar_image_url_id: updatedProfile.avatar_image_url_id ?? null,
    display_name: updatedProfile.display_name,
    bio: updatedProfile.bio ?? null,
    karma: karma,
    posts: postsPagination,
    comments: commentsPagination,
    created_at: toISOStringSafe(updatedProfile.created_at),
    updated_at: toISOStringSafe(updatedProfile.updated_at),
    deleted_at: updatedProfile.deleted_at
      ? toISOStringSafe(updatedProfile.deleted_at)
      : null,
  };
  return result satisfies IRedditCommunityUserProfile;
}
