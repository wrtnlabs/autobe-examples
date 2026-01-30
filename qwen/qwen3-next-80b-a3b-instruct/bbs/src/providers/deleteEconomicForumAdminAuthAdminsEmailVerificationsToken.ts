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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteEconomicForumAdminAuthAdminsEmailVerificationsToken(props: {
  admin: AdminPayload;
  token: string & tags.Format<"uuid">;
}): Promise<void> {
  const deleted =
    await MyGlobal.prisma.economic_forum_admin_email_verifications.delete({
      where: { token: props.token },
    });
  if (!deleted) {
    throw new HttpException("Token not found", 404);
  }
}
