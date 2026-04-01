import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerApprovalRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformSellerApprovalRequestCollector {
  export async function collect(props: {
    body: IMallPlatformSellerApprovalRequest.ICreate;
    seller: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      status: "pending",
      rejection_reason: null,
      reviewed_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      seller: { connect: { id: props.seller.id } },
    } satisfies Prisma.mall_platform_seller_approval_requestsCreateInput;
  }
}
