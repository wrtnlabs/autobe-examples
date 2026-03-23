import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerSystemConfig";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTrackerSystemConfigCollector {
  export async function collect(props: {
    body: IHrmTrackerSystemConfig.ICreate;
    hrmTrackerOrganizations: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      key: props.body.key,
      value: props.body.value,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.hrmTrackerOrganizations.id } },
    } satisfies Prisma.hrm_tracker_system_configsCreateInput;
  }
}
