import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackRoleCollector {
  export async function collect(props: {
    body: IHrmTimeTrackRole.ICreate;
    hrmTimeTrackOrganizations: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      is_builtin: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.hrmTimeTrackOrganizations.id } },
      permissions:
        props.body.permissions.length > 0
          ? {
              create: props.body.permissions.map((permission) => ({
                id: v4(),
                permission,
                created_at: new Date(),
              })),
            }
          : undefined,
    } satisfies Prisma.hrm_time_track_rolesCreateInput;
  }
}
