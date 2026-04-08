import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallAdministratorRequestTransformer } from "../transformers/ShoppingMallAdministratorRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerAdministratorRequestsAdministratorRequestId(props: {
  customer: CustomerPayload;
  administratorRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorRequest> {
  // Check if customer owns this request via the polymorphic link table
  const customerLink =
    await MyGlobal.prisma.shopping_mall_administrator_request_of_customers.findFirst(
      {
        where: {
          shopping_mall_administrator_request_id: props.administratorRequestId,
          customer_id: props.customer.id,
        },
        select: { id: true },
      },
    );
  if (customerLink === null) {
    throw new HttpException("Forbidden", 403);
  }
  const record =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findFirstOrThrow(
      {
        ...ShoppingMallAdministratorRequestTransformer.select(),
        where: {
          id: props.administratorRequestId,
        },
      },
    );
  return await ShoppingMallAdministratorRequestTransformer.transform(record);
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
// import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
// import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallCustomerAdministratorRequestsAdministratorRequestId(props: {
//   customer: CustomerPayload;
//   administratorRequestId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallAdministratorRequest> {
//   const record = await MyGlobal.prisma.shopping_mall_administrator_requests.findFirstOrThrow({
//     ...ShoppingMallAdministratorRequestTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallAdministratorRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------