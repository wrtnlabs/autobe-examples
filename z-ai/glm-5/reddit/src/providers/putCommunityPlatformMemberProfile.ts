import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformMemberTransformer } from "../transformers/CommunityPlatformMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberProfile(props: {
  member: MemberPayload;
  body: ICommunityPlatformMember.IUpdate;
}): Promise<ICommunityPlatformMember> {
  // Validate avatar_file_id if provided
  if (props.body.avatar_file_id !== undefined) {
    const file = await MyGlobal.prisma.community_platform_files.findUnique({
      where: { id: props.body.avatar_file_id },
    });
    if (
      file === null ||
      file.owner_type !== "user_avatar" ||
      file.owner_id !== props.member.id
    ) {
      throw new HttpException("Invalid avatar file reference", 400);
    }
  }
  // Build update data with partial update semantics
  const updateData: {
    display_name?: string | null;
    bio?: string | null;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.display_name !== undefined) {
    updateData.display_name = props.body.display_name;
  }
  if (props.body.bio !== undefined) {
    updateData.bio = props.body.bio;
  }
  // Update member
  const member = await MyGlobal.prisma.community_platform_members.update({
    where: { id: props.member.id },
    data: updateData,
    ...CommunityPlatformMemberTransformer.select(),
  });
  // Get avatar file for response
  const avatarFile = await MyGlobal.prisma.community_platform_files.findUnique({
    where: {
      owner_type_owner_id: {
        owner_type: "user_avatar",
        owner_id: props.member.id,
      },
    },
  });
  // Transform and attach avatar
  const result = await CommunityPlatformMemberTransformer.transform(member);
  return {
    ...result,
    avatar: avatarFile?.path ?? null,
  };
}
