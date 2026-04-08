import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordReset";
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

export async function postRedditLikeMemberPasswordResets(props: {
  member: MemberPayload;
  body: IRedditLikeMemberPasswordReset.ICreate;
}): Promise<IRedditLikeMemberPasswordReset.IResponse> {
  // Query member by email (case-insensitive)
  const foundMember = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: {
      email: {
        equals: props.body.email,
        mode: "insensitive",
      },
      deleted_at: null,
    },
  });
  // If member exists, create password reset record
  if (foundMember) {
    const id: string & tags.Format<"uuid"> = v4();
    const token: string = v4();
    const expires_at: Date = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    await MyGlobal.prisma.reddit_like_member_password_resets.create({
      data: {
        id,
        token,
        expires_at,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        redditLikeMember: { connect: { id: foundMember.id } },
      } satisfies Prisma.reddit_like_member_password_resetsCreateInput,
    });
  }
  // Return generic success response regardless of whether email was found
  // This prevents email enumeration attacks
  return {
    success: true,
    message:
      "If an account exists with this email, a password reset link has been sent.",
  } satisfies IRedditLikeMemberPasswordReset.IResponse;
}
