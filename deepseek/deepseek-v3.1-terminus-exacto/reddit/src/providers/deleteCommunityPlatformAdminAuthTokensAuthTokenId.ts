import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformAdminAuthTokensAuthTokenId(props: {
  admin: AdminPayload;
  authTokenId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if token exists and is not already deleted
  const existingToken =
    await MyGlobal.prisma.community_platform_auth_tokens.findUniqueOrThrow({
      where: { id: props.authTokenId },
    });
  if (existingToken.deleted_at !== null) {
    throw new HttpException("Authentication token is already deleted", 400);
  }
  // Perform soft delete - foreign key cascades handle junction tables automatically
  await MyGlobal.prisma.community_platform_auth_tokens.update({
    where: { id: props.authTokenId },
    data: {
      deleted_at: new Date().toISOString(),
    },
  });
}
