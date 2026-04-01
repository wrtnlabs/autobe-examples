import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformRefundRequestCollector {
  export async function collect(props: {
    body: IMallPlatformRefundRequest.ICreate;
    orderItem: IEntity;
    customer: IEntity;
    seller: IEntity;
    administrator?: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      reviewed_at: null,
      review_note: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      orderItem: {
        connect: { id: props.orderItem.id },
      },
      customer: {
        connect: { id: props.customer.id },
      },
      seller: {
        connect: { id: props.seller.id },
      },
      administrator: props.administrator
        ? {
            connect: { id: props.administrator.id },
          }
        : undefined,
    } satisfies Prisma.mall_platform_refund_requestsCreateInput;
  }
}
