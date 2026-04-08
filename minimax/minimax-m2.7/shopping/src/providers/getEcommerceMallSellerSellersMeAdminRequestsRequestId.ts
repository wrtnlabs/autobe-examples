import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerAdminRequestTransformer } from "../transformers/EcommerceMallSellerAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerSellersMeAdminRequestsRequestId(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerAdminRequest> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_seller_admin_requests.findFirstOrThrow(
      {
        ...EcommerceMallSellerAdminRequestTransformer.select(),
        where: {
          id: props.requestId,
          ecommerce_mall_seller_id: props.seller.id,
          deleted_at: null,
        },
      },
    );
  return await EcommerceMallSellerAdminRequestTransformer.transform(record);
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
// import { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerSellersMeAdminRequestsRequestId(props: {
//   seller: SellerPayload;
//   requestId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallSellerAdminRequest> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_admin_requests.findFirstOrThrow({
//     ...EcommerceMallSellerAdminRequestTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerAdminRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------