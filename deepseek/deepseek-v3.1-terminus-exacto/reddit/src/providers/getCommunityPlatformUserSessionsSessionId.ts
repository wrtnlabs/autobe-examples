import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformUserSessionTransformer } from "../transformers/CommunityPlatformUserSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserSessionsSessionId(props: {
  user: UserPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUserSession> {
  // Retrieve session with transformer and ensure it exists
  const session =
    await MyGlobal.prisma.community_platform_user_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      ...CommunityPlatformUserSessionTransformer.select(),
    });
  // Check authorization: session must belong to the current user
  // Use the relation user.id, not raw foreign key column
  if (session.user.id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Convert database record to DTO using transformer
  return await CommunityPlatformUserSessionTransformer.transform(session);
}
