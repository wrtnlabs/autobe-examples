import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformInvitationCollector {
  export async function collect(props: {
    body: IHrmPlatformInvitation.ICreate;
    hrmPlatformOrganizations: IEntity;
    hrmPlatformMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      email: props.body.email,
      status: "pending",
      invited_at: new Date(),
      expires_at: new Date(props.body.expires_at),
      accepted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.hrmPlatformOrganizations.id } },
      user: undefined,
      invitedBy: { connect: { id: props.hrmPlatformMembers.id } },
    } satisfies Prisma.hrm_platform_invitationsCreateInput;
  }
}
