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

export async function putCommunityPlatformMemberMembersMemberId(props: {
  member: MemberPayload;
  memberId: string;
  body: ICommunityPlatformMember.IUpdate;
}): Promise<ICommunityPlatformMember> {
  // Verify that the authenticated member matches the requested member ID
  if (props.member.id !== props.memberId) {
    throw new HttpException(
      "Forbidden: You can only update your own profile",
      403,
    );
  }
  // Since ICommunityPlatformMember.IUpdate is an empty object, no fields can be updated
  // Query the member directly from the database (no data changes)
  const member = await MyGlobal.prisma.community_platform_members.findUnique({
    where: {
      id: props.memberId,
      deleted_at: null,
    },
    ...CommunityPlatformMemberTransformer.select(),
  });
  // Return the current profile unchanged
  if (!member) {
    throw new HttpException("Member not found", 404);
  }
  return await CommunityPlatformMemberTransformer.transform(member);
}
