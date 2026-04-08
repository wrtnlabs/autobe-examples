import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackProjectMemberCollector {
  export async function collect(props: {
    body: IHrmTimeTrackProjectMember.ICreate;
    hrmTimeTrackProjects: IEntity;
  }) {
    return {
      id: v4(),
      role: props.body.role ?? "member",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.body.employee_id } },
      project: { connect: { id: props.hrmTimeTrackProjects.id } },
    } satisfies Prisma.hrm_time_track_project_membersCreateInput;
  }
}
