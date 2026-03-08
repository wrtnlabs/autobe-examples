import { ICommunityPlatformAvatarFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAvatarFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformAvatarFileCollector } from "../collectors/CommunityPlatformAvatarFileCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformMemberTransformer } from "../transformers/CommunityPlatformMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberAvatar(props: {
  member: {
    id: string;
    session_id: string;
  };
  body: ICommunityPlatformAvatarFile.ICreate;
}): Promise<ICommunityPlatformMember> {
  // Step 1: Soft-delete existing avatar file if exists
  const existingAvatar =
    await MyGlobal.prisma.community_platform_files.findUnique({
      where: { member_id: props.member.id },
    });
  if (existingAvatar !== null) {
    await MyGlobal.prisma.community_platform_files.update({
      where: { id: existingAvatar.id },
      data: { deleted_at: new Date() },
    });
  }
  // Step 2: Create new avatar file using collector
  const fileData = await CommunityPlatformAvatarFileCollector.collect({
    body: props.body,
    communityPlatformMembers: { id: props.member.id },
    communityPlatformMemberSessions: { id: props.member.session_id },
  });
  const newFile = await MyGlobal.prisma.community_platform_files.create({
    data: fileData,
  });
  // Step 3: Update member's avatar_url
  await MyGlobal.prisma.community_platform_members.update({
    where: { id: props.member.id },
    data: {
      avatar_url: newFile.storage_path,
      updated_at: new Date(),
    },
  });
  // Step 4: Fetch and return updated member using transformer
  const member =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: { id: props.member.id },
      ...CommunityPlatformMemberTransformer.select(),
    });
  return await CommunityPlatformMemberTransformer.transform(member);
}
