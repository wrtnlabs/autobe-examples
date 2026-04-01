import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { ErpHrmTimeMemberSessionTransformer } from "../transformers/ErpHrmTimeMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeMemberSession> {
  if (props.guest.session_id !== props.sessionId) {
    throw new HttpException("Forbidden", 403);
  }
  const session =
    await MyGlobal.prisma.erp_hrm_time_member_sessions.findUniqueOrThrow({
      where: {
        id: props.sessionId,
      },
      ...ErpHrmTimeMemberSessionTransformer.select(),
    });
  return await ErpHrmTimeMemberSessionTransformer.transform(session);
}
