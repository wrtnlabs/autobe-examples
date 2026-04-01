import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformAdministratorApprovalRequestCollector {
  export async function collect(props: {
    body: IMallPlatformAdministratorApprovalRequest.ICreate;
    administrator: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      rejection_reason: null,
      reviewed_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      administrator: {
        connect: {
          id: props.administrator.id,
        },
      },
      reviewerAdministrator: undefined,
    } satisfies Prisma.mall_platform_administrator_approval_requestsCreateInput;
  }
}
