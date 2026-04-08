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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerRegistrationSnapshotTransformer } from "../transformers/EcommerceMallSellerRegistrationSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminRegistrationsRegistrationIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  registrationId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
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
// export async function getEcommerceMallAdminRegistrationsRegistrationIdSnapshotsSnapshotId(props: {
//   admin: AdminPayload;
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