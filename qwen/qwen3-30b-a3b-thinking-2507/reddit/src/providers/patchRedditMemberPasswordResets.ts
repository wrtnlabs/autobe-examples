import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMemberPasswordReset";
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

export async function patchRedditMemberPasswordResets(props: {
  member: MemberPayload;
  body: IRedditMemberPasswordReset.IRequest;
}): Promise<IRedditMemberPasswordReset.IConfirm> {
  const body = props.body;
  const existingMember = await MyGlobal.prisma.reddit_members.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });
  if (!existingMember) {
    return {
      success: false,
      message: "No account found with that email",
    };
    const token = v4();
    const expiresAt = toISOStringSafe(
      new Date(Date.now() + 24 * 60 * 60 * 1000),
    );
    await MyGlobal.prisma.reddit_member_password_resets.create({
      data: {
        token,
        user_id: existingMember.id,
        expires_at: expiresAt,
        used_at: null,
      },
    });
    await PasswordUtil.sendPasswordReset(existingMember.email, token);
    return {
      success: true,
      message: "Password reset email has been sent to your inbox.",
    };
  }
}
