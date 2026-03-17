import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformMemberTransformer } from "../transformers/RedditPlatformMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditPlatformMemberProfile(props: {
  member: MemberPayload;
  body: IRedditPlatformMember.IUpdate;
}): Promise<IRedditPlatformMember> {
  // 1. Validate member exists and is not deleted
  const member =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: { id: props.member.id },
      select: { id: true, username: true, avatar_file_id: true },
    });
  // 2. Validate display_name (max 50 chars if provided)
  if (props.body.displayName !== undefined && props.body.displayName !== null) {
    if (props.body.displayName.length > 50) {
      throw new HttpException(
        "Display name exceeds maximum 50 characters",
        400,
      );
    }
  }
  // 3. Validate bio (max 500 chars if provided)
  if (props.body.bio !== undefined && props.body.bio !== null) {
    if (props.body.bio.length > 500) {
      throw new HttpException("Bio exceeds maximum 500 characters", 400);
    }
  }
  // 4. Validate avatar file if provided
  let validatedAvatarFileId: string | null | undefined =
    props.body.avatarFileId;
  if (
    props.body.avatarFileId !== undefined &&
    props.body.avatarFileId !== null
  ) {
    const file = await MyGlobal.prisma.reddit_platform_files.findFirst({
      where: {
        id: props.body.avatarFileId,
        owner_type: "member",
        owner_id: props.member.id,
        content_type: { in: ["image/jpeg", "image/png", "image/gif"] },
        file_size: { lte: 5242880 },
        deleted_at: null,
      },
    } satisfies Prisma.reddit_platform_filesFindManyArgs);
    if (file === null) {
      throw new HttpException("Avatar file not found or invalid", 400);
    }
    validatedAvatarFileId = props.body.avatarFileId;
    // Soft-delete old avatar if changed
    if (
      member.avatar_file_id !== null &&
      member.avatar_file_id !== props.body.avatarFileId
    ) {
      await MyGlobal.prisma.reddit_platform_files.update({
        where: { id: member.avatar_file_id },
        data: { deleted_at: new Date() },
      } satisfies Prisma.reddit_platform_filesUpdateArgs);
    }
  }
  // 5. Update member record
  const display_name =
    props.body.displayName === undefined ||
    props.body.displayName === null ||
    props.body.displayName === ""
      ? member.username
      : props.body.displayName;
  await MyGlobal.prisma.reddit_platform_members.update({
    where: { id: props.member.id },
    data: {
      display_name,
      ...(props.body.bio !== undefined && { bio: props.body.bio }),
      avatar_file_id: validatedAvatarFileId,
      updated_at: new Date(),
    },
  } satisfies Prisma.reddit_platform_membersUpdateArgs);
  // 6. Return updated profile
  const updated =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: { id: props.member.id },
      ...RedditPlatformMemberTransformer.select(),
    } satisfies Prisma.reddit_platform_membersFindUniqueArgs);
  return await RedditPlatformMemberTransformer.transform(updated);
}
