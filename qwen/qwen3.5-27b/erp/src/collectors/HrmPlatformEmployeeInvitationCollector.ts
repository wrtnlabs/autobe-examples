import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformEmployeeInvitationCollector {
  export async function collect(props: {
    body: IHrmPlatformEmployeeInvitation.ICreate;
    hrmPlatformOrganizations: IEntity;
  }) {
    const id: string = v4();
    const token: string = v4();
    const now: Date = new Date();
    const expiresAt: Date = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      id,
      email: props.body.email,
      token,
      status: "pending",
      expires_at: expiresAt,
      created_at: now,
      updated_at: now,
      redeemed_at: null,
      deleted_at: null,
      organization: { connect: { id: props.hrmPlatformOrganizations.id } },
      role: { connect: { id: props.body.role_id } },
      redeemedByMember: undefined,
    } satisfies Prisma.hrm_platform_employee_invitationsCreateInput;
  }
}
