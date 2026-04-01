import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberSession";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsMemberSessionAtSummaryTransformer } from "../transformers/HrmsMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmsMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IHrmsMemberSession.ISummary> {
  const session = await MyGlobal.prisma.hrms_member_sessions.findUniqueOrThrow({
    where: { id: props.sessionId },
    select: {
      hrms_member_id: true,
      ...HrmsMemberSessionAtSummaryTransformer.select().select,
    },
  });
  if (session.hrms_member_id !== props.member.id) {
    throw new HttpException("Not Found", 404);
  }
  const fullSession =
    await MyGlobal.prisma.hrms_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      ...HrmsMemberSessionAtSummaryTransformer.select(),
    });
  return await HrmsMemberSessionAtSummaryTransformer.transform(fullSession);
}
