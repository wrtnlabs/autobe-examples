import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackRoleCollector } from "../collectors/HrmTimeTrackRoleCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackRoleTransformer } from "../transformers/HrmTimeTrackRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackMemberRoles(props: {
  member: MemberPayload;
  body: IHrmTimeTrackRole.ICreate;
}): Promise<IHrmTimeTrackRole> {
  // Get the organization from the member's session
  const session =
    await MyGlobal.prisma.hrm_time_track_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { hrm_time_track_organization_id: true },
    });
  const record = await MyGlobal.prisma.hrm_time_track_roles.create({
    data: await HrmTimeTrackRoleCollector.collect({
      body: props.body,
      hrmTimeTrackOrganizations: { id: session.hrm_time_track_organization_id },
    }),
    ...HrmTimeTrackRoleTransformer.select(),
  });
  return await HrmTimeTrackRoleTransformer.transform(record);
}
