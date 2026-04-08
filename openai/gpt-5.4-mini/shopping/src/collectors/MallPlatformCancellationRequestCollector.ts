import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformCancellationRequestCollector {
  export async function collect(props: {
    body: IMallPlatformCancellationRequest.ICreate;
    orderItem: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      reviewed_at: null,
      review_result: null,
      reviewer_note: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: {
        connect: { id: props.orderItem.id },
      },
    } satisfies Prisma.mall_platform_cancellation_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace MallPlatformCancellationRequestCollector {
//         export async function collect(props: {
//           body: IMallPlatformCancellationRequest.ICreate;
//           mallPlatformOrderItems: IEntity; // from path parameter orderItemId
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       status: ...,
//       reviewed_at: ...,
//       review_result: ...,
//       reviewer_note: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       orderItem: ...,
//       reviewer: ...,
//       snapshots: ...,
//           } satisfies Prisma.mall_platform_cancellation_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------