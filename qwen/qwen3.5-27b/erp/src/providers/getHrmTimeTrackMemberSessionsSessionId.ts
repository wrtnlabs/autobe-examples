import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMemberSession";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackMemberSessionTransformer } from "../transformers/HrmTimeTrackMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackMemberSession> {
  const record =
    await MyGlobal.prisma.hrm_time_track_member_sessions.findFirstOrThrow({
      ...HrmTimeTrackMemberSessionTransformer.select(),
      where: {
        id: props.sessionId,
        hrm_time_track_member_id: props.member.id,
      },
    });
  return await HrmTimeTrackMemberSessionTransformer.transform(record);
}
