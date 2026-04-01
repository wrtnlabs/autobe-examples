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
  const member = props.member;
  const body = props.body;
  // Step 1: Fetch existing profile to validate existence
  const profile =
    await MyGlobal.prisma.reddit_community_user_profiles.findFirstOrThrow({
      where: {
        reddit_community_user_id: member.id,
        deleted_at: null,
      },
    });
  // Step 2: Validate display_name uniqueness if provided
  if (body.display_name !== undefined) {
    const displayNameConflict =
      await MyGlobal.prisma.reddit_community_user_profiles.findFirst({
        where: {
          display_name: body.display_name,
          id: {
            not: profile.id,
          },
          deleted_at: null,
        },
      });
    if (displayNameConflict !== null) {
      throw new HttpException("Display name already exists", 409);
    }
  }
  // Step 3: Validate avatar ownership if provided
  if (body.avatar_image_url_id !== undefined) {
    const avatar =
      await MyGlobal.prisma.reddit_community_user_avatars.findFirst({
        where: {
          id: body.avatar_image_url_id as string,
        },
      });
    if (avatar === null) {
      throw new HttpException("Avatar file not found", 400);
    }
    // Verify avatar belongs to this user
    if (avatar.reddit_community_user_id !== member.id) {
      throw new HttpException("Avatar does not belong to user", 400);
    }
  }
  // Step 4: Build update data
  const updateData: {
    display_name?: string;
    bio?: string | null;
    avatar_image_url_id?: string | null;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (body.display_name !== undefined) {
    updateData.display_name = body.display_name;
  }
  if (body.bio !== undefined) {
    updateData.bio = body.bio;
  }
  if (body.avatar_image_url_id !== undefined) {
    updateData.avatar_image_url_id = body.avatar_image_url_id;
  }
  // Step 5: Execute update
  const updated = await MyGlobal.prisma.reddit_community_user_profiles.update({
    where: {
      id: profile.id,
    },
    data: updateData,
  });
  // Step 6: Fetch updated profile with full selects
  const fullProfile =
    await MyGlobal.prisma.reddit_community_user_profiles.findUniqueOrThrow({
      where: {
        id: updated.id,
      },
      select: {
        id: true,
        display_name: true,
        bio: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            created_at: true,
          },
        },
        avatar: {
          select: {
            id: true,
          },
        },
      },
    });
  // Step 7: Transform and return
  const karmaRecord =
    await MyGlobal.prisma.reddit_community_user_karmas.findFirstOrThrow({
      where: {
        reddit_community_member_id: fullProfile.user.id,
      },
    });
  const user: IRedditCommunityMember.ISummary = {
    id: fullProfile.user.id,
    username: fullProfile.user.username,
    created_at: toISOStringSafe(fullProfile.user.created_at),
    karma:
      karmaRecord !== undefined && karmaRecord !== null
        ? Number(karmaRecord.current_score)
        : undefined,
  };
  const karma: IRedditCommunityUserKarma = {
    id: karmaRecord.id,
    reddit_member_id: karmaRecord.reddit_community_member_id,
    current_score: Number(karmaRecord.current_score),
    created_at: toISOStringSafe(karmaRecord.created_at),
    updated_at: toISOStringSafe(karmaRecord.updated_at),
  };
  const posts: IPageIRedditCommunityPost.ISummary = {
    pagination: {
      current: 1,
      limit: 20,
      records: 0,
      pages: 0,
    },
    data: [],
  };
  const comments: IPageIRedditCommunityComment.ISummary = {
    pagination: {
      current: 1,
      limit: 20,
      records: 0,
      pages: 0,
    },
    data: [],
  };
  return {
    id: fullProfile.id,
    user,
    avatar_image_url_id: fullProfile.avatar?.id ?? null,
    display_name: fullProfile.display_name,
    bio: fullProfile.bio ?? null,
    karma,
    posts,
    comments,
    created_at: toISOStringSafe(fullProfile.created_at),
    updated_at: toISOStringSafe(fullProfile.updated_at),
    deleted_at: fullProfile.deleted_at
      ? toISOStringSafe(fullProfile.deleted_at)
      : null,
  };
}
