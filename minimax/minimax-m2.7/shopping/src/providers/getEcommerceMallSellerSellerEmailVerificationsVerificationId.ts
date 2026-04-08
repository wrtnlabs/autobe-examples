import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerEmailVerificationTransformer } from "../transformers/EcommerceMallSellerEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerSellerEmailVerificationsVerificationId(props: {
  seller: SellerPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerEmailVerification> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_seller_email_verifications.findFirstOrThrow(
      {
        where: {
          id: props.verificationId,
        },
        ...EcommerceMallSellerEmailVerificationTransformer.select(),
      },
    );
  return await EcommerceMallSellerEmailVerificationTransformer.transform(
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
// import { IEcommerceMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerEmailVerification";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerSellerEmailVerificationsVerificationId(props: {
//   seller: SellerPayload;
//   verificationId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallSellerEmailVerification> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_email_verifications.findFirstOrThrow({
//     ...EcommerceMallSellerEmailVerificationTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerEmailVerificationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------