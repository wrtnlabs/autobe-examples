import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { CommunityPlatformMemberSessionTransformer } from "../transformers/CommunityPlatformMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformMemberSession> {
  if (props.guest.session_id !== props.sessionId) {
    throw new HttpException("Forbidden", 403);
  }
  const session =
    await MyGlobal.prisma.community_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      ...CommunityPlatformMemberSessionTransformer.select(),
    });
  return await CommunityPlatformMemberSessionTransformer.transform(session);
}
