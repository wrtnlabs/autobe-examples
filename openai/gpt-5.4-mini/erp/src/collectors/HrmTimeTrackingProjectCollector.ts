import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingProjectCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingProject.ICreate;
    organization: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      color_code: props.body.colorCode,
      status: props.body.status,
      budget_hours: props.body.budgetHours ?? null,
      start_date: props.body.startDate ?? null,
      end_date: props.body.endDate ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      organization: {
        connect: {
          id: props.organization.id,
        },
      },
    } satisfies Prisma.hrm_time_tracking_projectsCreateInput;
  }
}
