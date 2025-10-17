import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";

export async function postAuthAdminEmailVerify(props: {
  body: ICommunityPortalAdmin.IVerifyEmail;
}): Promise<ICommunityPortalAdmin.IVerifyEmailResponse> {
  const { body } = props;
  const { token, user_id } = body;
  let payload: unknown;
  try {
    payload = jwt.verify(
      token,
      (MyGlobal.env && (MyGlobal.env as any).EMAIL_VERIFY_TOKEN_SECRET) ||
        (MyGlobal.env as any).JWT_SECRET_KEY,
    );
  } catch (err) {
    throw new HttpException("Invalid or expired token", 401);
  }

  const maybeUserId =
    typeof payload === "object" && payload && "user_id" in payload
      ? String((payload as any).user_id)
      : undefined;

  // Validate / coerce to the expected tagged uuid string
  const idToUse = typia.assert<string & tags.Format<"uuid">>(
    maybeUserId ?? user_id,
  );

  if (!idToUse) throw new HttpException("Invalid or expired token", 401);

  try {
    const result = await MyGlobal.prisma.$transaction(async (prisma) => {
      const user = await prisma.community_portal_users.findUniqueOrThrow({
        where: { id: idToUse },
      });
      const member = await prisma.community_portal_members.findUniqueOrThrow({
        where: { user_id: user.id },
      });
      const updatedMember = await prisma.community_portal_members.update({
        where: { user_id: user.id },
        data: {
          is_email_verified: true,
          updated_at: toISOStringSafe(new Date()),
        },
      });
      await prisma.community_portal_users.update({
        where: { id: user.id },
        data: { updated_at: toISOStringSafe(new Date()) },
      });
      return { user, member: updatedMember };
    });

    const { user, member } = result;
    return {
      success: true,
      message: "Email verified",
      user: {
        id: user.id as string & tags.Format<"uuid">,
        username: user.username,
        display_name: user.display_name ?? undefined,
        karma: Number(user.karma),
        member_since: member.member_since
          ? toISOStringSafe(member.member_since)
          : undefined,
      },
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError ||
      (err && (err as any).code === "P2025")
    )
      throw new HttpException("Not Found", 404);
    throw new HttpException("Internal Server Error", 500);
  }
}
