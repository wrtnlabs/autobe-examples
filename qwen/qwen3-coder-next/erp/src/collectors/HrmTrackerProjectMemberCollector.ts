import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTrackerProjectMemberCollector {
  export async function collect(props: {
    body: IHrmTrackerProjectMember.ICreate;
    hrmTrackerProjects: IEntity;
    hrmTrackerEmployee: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      role: props.body.role,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.hrmTrackerEmployee.id } },
      project: { connect: { id: props.hrmTrackerProjects.id } },
    } satisfies Prisma.hrm_tracker_project_membersCreateInput;
  }
}
