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
    hrmPlatformOrganizations: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      color: props.body.color,
      status: "active",
      budget_hours: props.body.budgetHours ?? null,
      start_date: props.body.startDate ? new Date(props.body.startDate) : null,
      end_date: props.body.endDate ? new Date(props.body.endDate) : null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      organization: { connect: { id: props.hrmPlatformOrganizations.id } },
      // HasMany relations (reverse relations, not created here)
      projectMemberships: undefined,
      tasks: undefined,
      timelogs: undefined,
      timers: undefined,
    } satisfies Prisma.hrm_platform_projectsCreateInput;
  }
}
