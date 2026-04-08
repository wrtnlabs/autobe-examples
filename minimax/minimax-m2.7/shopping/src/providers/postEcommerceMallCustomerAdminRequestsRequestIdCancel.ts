import { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallAdminRequestOfCustomerTransformer } from "../transformers/EcommerceMallAdminRequestOfCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerAdminRequestsRequestIdCancel(props: {
  customer: CustomerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdminRequestOfCustomer> {
  // 1. Retrieve the admin request with customer ownership link
  const record =
    await MyGlobal.prisma.ecommerce_mall_admin_requests.findFirstOrThrow({
      where: {
        id: props.requestId,
        deleted_at: null,
      },
      select: {
        ...EcommerceMallAdminRequestOfCustomerTransformer.select().select,
        customer: {
          select: {
            id: true,
          },
        },
      },
    });
  // 2. Validate request status is 'pending'
  if (record.status !== "pending") {
    throw new HttpException(
      `Cannot cancel request with status: ${record.status}`,
      400,
    );
  }
  // 3. Validate requester ownership - must be a customer request
  if (record.actor_type !== "customer") {
    throw new HttpException("Forbidden", 403);
  }
  // Verify customer owns this request
  if (record.customer?.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Update request status to 'cancelled'
  const now = new Date();
  await MyGlobal.prisma.ecommerce_mall_admin_requests.update({
    where: { id: props.requestId },
    data: {
      status: "cancelled",
      updated_at: now,
    },
  });
  // 5. Return updated request using transformer
  const updatedRecord =
    await MyGlobal.prisma.ecommerce_mall_admin_requests.findFirstOrThrow({
      where: {
        id: props.requestId,
      },
      ...EcommerceMallAdminRequestOfCustomerTransformer.select(),
    });
  return await EcommerceMallAdminRequestOfCustomerTransformer.transform(
    updatedRecord,
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
// import { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
// import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerAdminRequestsRequestIdCancel(props: {
//   customer: CustomerPayload;
//   requestId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallAdminRequestOfCustomer> {
//   const record = await MyGlobal.prisma.ecommerce_mall_admin_requests.findFirstOrThrow({
//     ...EcommerceMallAdminRequestOfCustomerTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallAdminRequestOfCustomerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------