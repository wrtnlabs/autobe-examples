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
    employee: IEntity;
    project: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      role: props.body.role,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.employee.id } },
      project: { connect: { id: props.project.id } },
    } satisfies Prisma.hrm_platform_project_membersCreateInput;
  }
}
