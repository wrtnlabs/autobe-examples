import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformFileVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileVersion";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformFileCollector } from "../collectors/CommunityPlatformFileCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformFileTransformer } from "../transformers/CommunityPlatformFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberAvatar(props: {
  member: MemberPayload;
  body: ICommunityPlatformFile.ICreate;
}): Promise<ICommunityPlatformFile> {
  // Step 1: Soft-delete previous avatar if exists
  const previousAvatar =
    await MyGlobal.prisma.community_platform_files.findUnique({
      where: { member_id: props.member.id },
    });
  if (previousAvatar !== null && previousAvatar.deleted_at === null) {
    await MyGlobal.prisma.community_platform_files.update({
      where: { id: previousAvatar.id },
      data: { deleted_at: new Date() },
    });
  }
  // Step 2: Create new avatar file using Collector
  const createInput = await CommunityPlatformFileCollector.collect({
    body: props.body,
    communityPlatformMembers: { id: props.member.id },
    communityPlatformMemberSessions: { id: props.member.session_id },
  });
  const created = await MyGlobal.prisma.community_platform_files.create({
    data: createInput,
    ...CommunityPlatformFileTransformer.select(),
  });
  // Step 3: Update member's avatar_url with the storage path
  await MyGlobal.prisma.community_platform_members.update({
    where: { id: props.member.id },
    data: { avatar_url: created.storage_path },
  });
  // Step 4: Return transformed response
  return await CommunityPlatformFileTransformer.transform(created);
}
