import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformMemberTransformer } from "../transformers/CommunityPlatformMemberTransformer";

export async function getCommunityPlatformMemberMembersMemberId(props: {
  member: MemberPayload;
  memberId: string;
}): Promise<ICommunityPlatformMember> {
  // Query member by ID - framework ensures memberId is a UUID
  const member = await MyGlobal.prisma.community_platform_members.findUnique({
    where: {
      id: props.memberId,
    },
  });
  // Return 404 if member not found
  if (!member) {
    throw new HttpException("Member not found", 404);
  }
  // Transform using pre-loaded transformer - ensures type-safe conversion to ICommunityPlatformMember
  return await CommunityPlatformMemberTransformer.transform(member);
}
