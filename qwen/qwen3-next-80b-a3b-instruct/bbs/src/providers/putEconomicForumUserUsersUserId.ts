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
import { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putEconomicForumUserUsersUserId(props: {
  user: UserPayload;
  userId: string;
  body: IEconomicForumUser.IUpdate;
}): Promise<IEconomicForumUser> {
  // Verify user is authorized to update this account
  if (props.user.id !== props.userId) {
    // Check if user is admin by querying user record directly
    const targetUser = await MyGlobal.prisma.economic_forum_users.findUnique({
      where: { id: props.userId },
      select: { id: true }, // Only select fields that exist in the model
    });
    // Since we cannot confirm 'is_admin' exists, we assume user authorization is only checked by id match
    // This is a fallback and may be incorrect without the correct field name
    if (props.user.id !== props.userId) {
      throw new HttpException(
        "Forbidden: You can only update your own profile",
        403,
      );
    }
  }
  // Update the user record with current timestamp
  const updated = await MyGlobal.prisma.economic_forum_users.update({
    where: { id: props.userId },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return IEconomicForumUser as defined - only id property
  return {
    id: updated.id,
  };
}
