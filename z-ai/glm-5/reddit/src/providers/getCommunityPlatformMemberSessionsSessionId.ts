import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformMemberSessionTransformer } from "../transformers/CommunityPlatformMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformMemberSession> {
  const session =
    await MyGlobal.prisma.community_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      ...CommunityPlatformMemberSessionTransformer.select(),
    });
  if (session.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (session.expired_at < new Date()) {
    throw new HttpException("Unauthorized", 401);
  }
  return await CommunityPlatformMemberSessionTransformer.transform(session);
}
