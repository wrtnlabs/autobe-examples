import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformProjectMemberCollector {
  export async function collect(props: {
    body: IHrmPlatformProjectMember.ICreate;
    hrmPlatformProjects: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      role: props.body.role,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.body.hrm_platform_employee_id } },
      project: { connect: { id: props.hrmPlatformProjects.id } },
    } satisfies Prisma.hrm_platform_project_membersCreateInput;
  }
}
