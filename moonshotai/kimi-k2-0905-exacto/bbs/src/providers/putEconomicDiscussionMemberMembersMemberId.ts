import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putEconomicDiscussionMemberMembersMemberId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionMember.IUpdate;
}): Promise<IEconomicDiscussionMember> {
  // Authorization check - members can only update their own profiles
  if (props.memberId !== props.member.id) {
    throw new HttpException("You can only update your own profile", 403);
  }

  // Check if username is being updated and verify uniqueness
  if (props.body.username) {
    const existingUsername =
      await MyGlobal.prisma.economic_discussion_members.findFirst({
        where: {
          username: props.body.username,
          id: { not: props.memberId },
        },
      });

    if (existingUsername) {
      throw new HttpException("Username is already taken", 400);
    }
  }

  // Check if email is being updated and verify uniqueness
  if (props.body.email) {
    const existingEmail =
      await MyGlobal.prisma.economic_discussion_members.findFirst({
        where: {
          email: props.body.email,
          id: { not: props.memberId },
        },
      });

    if (existingEmail) {
      throw new HttpException("Email is already taken", 400);
    }
  }

  // Update the member profile
  const updated = await MyGlobal.prisma.economic_discussion_members.update({
    where: { id: props.memberId },
    data: {
      ...props.body,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the formatted response
  return {
    id: updated.id,
    username: updated.username,
    email: updated.email,
    email_verified: updated.email_verified,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    reputation_score: updated.reputation_score,
  };
}
