import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformReviewCollector {
  export async function collect(props: {
    body: IMallPlatformReview.ICreate;
    customer: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      rating: props.body.rating,
      content: props.body.content ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      customer: {
        connect: {
          id: props.customer.id,
        },
      },
      orderItem: {
        connect: {
          id: props.body.orderItemId,
        },
      },
      product: {
        connect: {
          id: props.body.productId,
        },
      },
    } satisfies Prisma.mall_platform_reviewsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace MallPlatformReviewCollector {
//         export async function collect(props: {
//           body: IMallPlatformReview.ICreate;
//           mallPlatformCustomers: IEntity; // from authorized actor
// mallPlatformCustomerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       rating: ...,
//       content: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       customer: ...,
//       orderItem: ...,
//       product: ...,
//       snapshots: ...,
//           } satisfies Prisma.mall_platform_reviewsCreateInput;
//         }
//       }
//--------------------------------------------------------------