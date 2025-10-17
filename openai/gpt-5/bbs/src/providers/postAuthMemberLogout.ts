import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postAuthMemberLogout(props: {
  member: MemberPayload;
}): Promise<void> {
  /**
   * Token-layer revocation is enforced outside the database and this provider
   * has no access to the presented token/jti via props. DB persistence is not
   * required. Perform an optional audit touch on the user record.
   */
  try {
    await MyGlobal.prisma.econ_discuss_users.update({
      where: { id: props.member.id },
      data: {
        updated_at: toISOStringSafe(new Date()),
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      throw new HttpException("Not Found", 404);
    }
    throw err;
  }

  return;
}
