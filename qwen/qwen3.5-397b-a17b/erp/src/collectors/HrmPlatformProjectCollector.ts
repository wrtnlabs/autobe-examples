import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformProjectCollector {
  export async function collect(props: {
    body: IHrmPlatformProject.ICreate;
    hrmPlatformMembers: IEntity;
    hrmPlatformMemberSessions: IEntity;
  }) {
    const id: string = v4();
    // Query member to get organization_id
    const member =
      await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
        where: { id: props.hrmPlatformMembers.id },
      });
    return {
      // Scalar fields
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      color_code: props.body.color_code,
      status: props.body.status ?? "active",
      budget_hours: props.body.budget_hours ?? null,
      started_at: props.body.started_at
        ? new Date(props.body.started_at)
        : null,
      ended_at: props.body.ended_at ? new Date(props.body.ended_at) : null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      organization: {
        connect: { id: member.organization_id },
      },
      // HasMany relations (not needed for create)
    } satisfies Prisma.hrm_platform_projectsCreateInput;
  }
}
