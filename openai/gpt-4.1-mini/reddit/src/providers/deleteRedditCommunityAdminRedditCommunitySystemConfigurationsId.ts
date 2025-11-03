import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminRedditCommunitySystemConfigurationsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    await MyGlobal.prisma.reddit_community_system_configurations.delete({
      where: { id: props.id },
    });
  } catch (error) {
    // Prisma throws if not found - catch and rethrow as HttpException 404
    throw new HttpException("Not Found", 404);
  }
}
