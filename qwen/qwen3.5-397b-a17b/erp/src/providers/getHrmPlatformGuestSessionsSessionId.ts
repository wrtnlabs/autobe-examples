import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { HrmPlatformMemberSessionTransformer } from "../transformers/HrmPlatformMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformMemberSession> {
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      ...HrmPlatformMemberSessionTransformer.select(),
    });
  return await HrmPlatformMemberSessionTransformer.transform(session);
}
