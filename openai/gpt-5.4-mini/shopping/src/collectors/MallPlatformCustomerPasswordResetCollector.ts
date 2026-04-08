import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformCustomerPasswordResetCollector {
  export async function collect(props: {
    body: IMallPlatformCustomerPasswordReset.ICreate;
  }) {
    const now: Date = new Date();
    const expired_at: Date = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour reset window
    return {
      id: v4(),
      token: v4(),
      expired_at,
      used_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      customer: { connect: { id: props.body.mall_platform_customer_id } },
    } satisfies Prisma.mall_platform_customer_password_resetsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace MallPlatformCustomerPasswordResetCollector {
//         export async function collect(props: {
//           body: IMallPlatformCustomerPasswordReset.ICreate;
//           mallPlatformCustomers: IEntity; // from request body mall_platform_customer_id
//           
//           
//         }) {
//           return {
//       id: ...,
//       token: ...,
//       expired_at: ...,
//       used_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       customer: ...,
//           } satisfies Prisma.mall_platform_customer_password_resetsCreateInput;
//         }
//       }
//--------------------------------------------------------------