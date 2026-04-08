import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformCustomerSessionCollector {
  export async function collect(props: {
    body: IMallPlatformCustomerSession.ICreate;
    ip: string;
  }) {
    const id = v4();
    const customer =
      await MyGlobal.prisma.mall_platform_customers.findFirstOrThrow({
        where: {
          email: props.body.email,
        },
      });
    return {
      id,
      ip: props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      customer: {
        connect: {
          id: customer.id,
        },
      },
    } satisfies Prisma.mall_platform_customer_sessionsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace MallPlatformCustomerSessionCollector {
//         export async function collect(props: {
//           body: IMallPlatformCustomerSession.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       ip: ...,
//       href: ...,
//       referrer: ...,
//       created_at: ...,
//       expired_at: ...,
//       customer: ...,
//           } satisfies Prisma.mall_platform_customer_sessionsCreateInput;
//         }
//       }
//--------------------------------------------------------------