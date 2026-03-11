import { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAdminRequestDecisionCollector {
  export async function collect(props: {
    body: IDiscussionBoardAdminRequestDecision.ICreate;
    superAdmin: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      decision: props.body.decision,
      rejection_reason: props.body.rejection_reason ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      adminRequest: { connect: { id: props.body.admin_request_id } },
      superAdmin: { connect: { id: props.superAdmin.id } },
    } satisfies Prisma.discussion_board_admin_request_decisionsCreateInput;
  }
}
