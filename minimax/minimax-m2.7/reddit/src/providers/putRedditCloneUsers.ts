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
import { RedditCloneMemberSessionTransformer } from "../transformers/RedditCloneMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneUsers(props: {
  body: IRedditCloneMemberSession.IUpdate;
}): Promise<IRedditCloneMemberSession> {
  // Get authenticated member from request context
  const member =
    (globalThis as any).request?.user ?? (globalThis as any).request?.member;
  if (!member?.id) {
    throw new HttpException("Unauthorized", 401);
  }
  const memberId = member.id as string & tags.Format<"uuid">;
  // Verify member exists and is not soft-deleted
  const existingMember = await MyGlobal.prisma.reddit_clone_members.findUnique({
    where: { id: memberId },
    select: { id: true, deleted_at: true },
  });
  if (!existingMember || existingMember.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Find user's profile
  const profile = await MyGlobal.prisma.reddit_clone_user_profiles.findUnique({
    where: { reddit_clone_member_id: memberId },
    select: { id: true, reddit_clone_file_association_id: true },
  });
  if (!profile) {
    throw new HttpException("Profile not found", 404);
  }
  // Handle avatar file validation
  let newFileAssociationId: string | null | undefined = undefined;
  if (props.body.avatar !== undefined) {
    if (props.body.avatar === null) {
      newFileAssociationId = null;
    } else {
      // Validate file association exists for this user with target_type='user'
      const fileAssociation =
        await MyGlobal.prisma.reddit_clone_file_associations.findFirst({
          where: {
            reddit_clone_file_id: props.body.avatar as string,
            target_id: memberId,
            target_type: "user",
          },
          select: { id: true },
        });
      if (!fileAssociation) {
        throw new HttpException(
          "Avatar file not found or not associated with user",
          400,
        );
      }
      newFileAssociationId = fileAssociation.id;
    }
  }
  // Truncate display_name to max 100 characters
  const displayName =
    props.body.display_name.length > 100
      ? props.body.display_name.slice(0, 100)
      : props.body.display_name;
  // Truncate bio to max 500 characters if provided
  const bio =
    props.body.bio !== undefined
      ? props.body.bio !== null && props.body.bio.length > 500
        ? props.body.bio.slice(0, 500)
        : props.body.bio
      : undefined;
  // Prepare update data with only provided fields
  const updateData: {
    display_name: string;
    bio?: string | null;
    reddit_clone_file_association_id?: string | null;
    updated_at: Date;
  } = {
    display_name: displayName,
    updated_at: new Date(),
  };
  if (bio !== undefined) {
    updateData.bio = bio;
  }
  if (newFileAssociationId !== undefined) {
    updateData.reddit_clone_file_association_id = newFileAssociationId;
  }
  // Update profile
  await MyGlobal.prisma.reddit_clone_user_profiles.update({
    where: { id: profile.id },
    data: updateData,
  });
  // Also update member's updated_at
  await MyGlobal.prisma.reddit_clone_members.update({
    where: { id: memberId },
    data: { updated_at: new Date() },
  });
  // Fetch complete member data for response using transformer
  const memberData =
    await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
      where: { id: memberId },
      ...(RedditCloneMemberSessionTransformer.select() as any),
    });
  return await RedditCloneMemberSessionTransformer.transform(memberData as any);
}
