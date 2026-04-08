import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistrationSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerRegistrationSnapshotTransformer } from "../transformers/EcommerceMallSellerRegistrationSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerRegistrationsRegistrationIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  registrationId: string;
  snapshotId: string;
}): Promise<IEcommerceMallSellerRegistrationSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.findFirstOrThrow(
      {
        ...EcommerceMallSellerRegistrationSnapshotTransformer.select(),
        where: {
          id: props.snapshotId,
          ecommerce_mall_seller_registration_id: props.registrationId,
        },
      },
    );
  if (record.registration.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallSellerRegistrationSnapshotTransformer.transform(
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
// import { IEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistrationSnapshot";
// import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerRegistrationsRegistrationIdSnapshotsSnapshotId(props: {
//   seller: SellerPayload;
//   registrationId: string;
//   snapshotId: string;
// }): Promise<IEcommerceMallSellerRegistrationSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.findFirstOrThrow({
//     ...EcommerceMallSellerRegistrationSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerRegistrationSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------