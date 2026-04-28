import { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformAdministratorPromotionRequestOfCustomerTransformer } from "../transformers/EcommercePlatformAdministratorPromotionRequestOfCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommercePlatformCustomerAdministratorPromotionRequestsRequestId(props: {
  customer: CustomerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommercePlatformAdministratorPromotionRequestOfCustomer> {
  // Verify ownership: this customer must be the one who submitted the request
  const subtype =
    await MyGlobal.prisma.ecommerce_platform_administrator_promotion_request_of_customers.findFirst(
      {
        where: {
          ecommerce_platform_administrator_promotion_request_id:
            props.requestId,
          ecommerce_platform_customer_id: props.customer.id,
        },
      },
    );
  if (subtype === null) {
    throw new HttpException("Forbidden", 403);
  }
  const record =
    await MyGlobal.prisma.ecommerce_platform_administrator_promotion_requests.findUniqueOrThrow(
      {
        where: {
          id: props.requestId,
        },
        ...EcommercePlatformAdministratorPromotionRequestOfCustomerTransformer.select(),
      },
    );
  return await EcommercePlatformAdministratorPromotionRequestOfCustomerTransformer.transform(
    record,
  );
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
// import { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommercePlatformCustomerAdministratorPromotionRequestsRequestId(props: {
//   customer: CustomerPayload;
//   requestId: string & tags.Format<"uuid">;
// }): Promise<IEcommercePlatformAdministratorPromotionRequestOfCustomer> {
//   const record = await MyGlobal.prisma.ecommerce_platform_administrator_promotion_requests.findFirstOrThrow({
//     ...EcommercePlatformAdministratorPromotionRequestOfCustomerTransformer.select(),
//     where: { ... },
//   });
//   return await EcommercePlatformAdministratorPromotionRequestOfCustomerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------