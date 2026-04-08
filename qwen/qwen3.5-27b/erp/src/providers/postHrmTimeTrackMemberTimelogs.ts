import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackTimelogCollector } from "../collectors/HrmTimeTrackTimelogCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackTimelogTransformer } from "../transformers/HrmTimeTrackTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmTimeTrackTimelog.ICreate;
}): Promise<IHrmTimeTrackTimelog> {
  const record = await MyGlobal.prisma.hrm_time_track_timelogs.create({
    data: await HrmTimeTrackTimelogCollector.collect({
      body: props.body,
      hrmTimeTrackEmployees: { id: props.member.id } satisfies IEntity,
      hrmTimeTrackMemberSessions: {
        id: props.member.session_id,
      } satisfies IEntity,
    }),
    ...HrmTimeTrackTimelogTransformer.select(),
  });
  return await HrmTimeTrackTimelogTransformer.transform(record);
}
