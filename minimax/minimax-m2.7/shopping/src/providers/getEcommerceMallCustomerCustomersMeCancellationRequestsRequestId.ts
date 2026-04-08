import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCancellationRequestTransformer } from "../transformers/EcommerceMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerCustomersMeCancellationRequestsRequestId(props: {
  customer: CustomerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCancellationRequest> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        ...EcommerceMallCancellationRequestTransformer.select(),
        where: {
          id: props.requestId,
          ecommerce_mall_customer_id: props.customer.id,
        },
      },
    );
  return await EcommerceMallCancellationRequestTransformer.transform(record);
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
// import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerCustomersMeCancellationRequestsRequestId(props: {
//   customer: CustomerPayload;
//   requestId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallCancellationRequest> {
//   const record = await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirstOrThrow({
//     ...EcommerceMallCancellationRequestTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCancellationRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------