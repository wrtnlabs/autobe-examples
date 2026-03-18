import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingInvitationCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingInvitation.ICreate;
    organization: IEntity;
    userAccount?: IEntity;
    invitedByMember?: IEntity;
  }) {
    const id: string = v4();
    const token: string = v4();
    const now: Date = new Date();
    const expiresAt: Date = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);
    return {
      id,
      email: props.body.email,
      token,
      status: "pending",
      expires_at: expiresAt,
      accepted_at: null,
      revoked_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      organization: { connect: { id: props.organization.id } },
      userAccount: props.userAccount
        ? { connect: { id: props.userAccount.id } }
        : undefined,
      invitedByMember: props.invitedByMember
        ? { connect: { id: props.invitedByMember.id } }
        : undefined,
    } satisfies Prisma.hrm_time_tracking_invitationsCreateInput;
  }
}
