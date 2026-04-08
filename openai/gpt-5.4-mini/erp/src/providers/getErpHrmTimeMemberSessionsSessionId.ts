import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeMemberSessionTransformer } from "../transformers/ErpHrmTimeMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeMemberSession> {
  const session =
    await MyGlobal.prisma.erp_hrm_time_member_sessions.findUniqueOrThrow({
      where: {
        id: props.sessionId,
      },
      select: {
        id: true,
        erp_hrm_time_member_id: true,
      },
    });
  if (session.erp_hrm_time_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const found =
    await MyGlobal.prisma.erp_hrm_time_member_sessions.findUniqueOrThrow({
      where: {
        id: props.sessionId,
      },
      ...ErpHrmTimeMemberSessionTransformer.select(),
    });
  return ErpHrmTimeMemberSessionTransformer.transform(found);
}
