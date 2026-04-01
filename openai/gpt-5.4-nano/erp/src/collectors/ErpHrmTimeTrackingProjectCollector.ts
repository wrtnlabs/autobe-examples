import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTrackingProjectCollector {
  export async function collect(props: {
    body: IErpHrmTimeTrackingProject.ICreate;
    erpHrmTimeTrackingOrganizations: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      color: props.body.color,
      status: props.body.status,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: {
        connect: { id: props.erpHrmTimeTrackingOrganizations.id },
      },
      // hasMany relations omitted intentionally
    } satisfies Prisma.erp_hrm_time_tracking_projectsCreateInput;
  }
}
