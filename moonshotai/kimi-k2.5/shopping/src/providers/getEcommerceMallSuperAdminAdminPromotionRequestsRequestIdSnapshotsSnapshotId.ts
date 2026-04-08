import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminPromotionRequestSnapshotTransformer } from "../transformers/EcommerceMallAdminPromotionRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSuperAdminAdminPromotionRequestsRequestIdSnapshotsSnapshotId(props: {
  superAdmin: SuperadminPayload;
  requestId: string;
  snapshotId: string;
}): Promise<IEcommerceMallAdminPromotionRequestSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_request_snapshots.findFirstOrThrow(
      {
        ...EcommerceMallAdminPromotionRequestSnapshotTransformer.select(),
        where: {
          id: props.snapshotId,
          admin_promotion_request_id: props.requestId,
        },
      },
    );
  return await EcommerceMallAdminPromotionRequestSnapshotTransformer.transform(
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
// import { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
// import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSuperAdminAdminPromotionRequestsRequestIdSnapshotsSnapshotId(props: {
//   superAdmin: SuperadminPayload;
//   requestId: string;
//   snapshotId: string;
// }): Promise<IEcommerceMallAdminPromotionRequestSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_admin_promotion_request_snapshots.findFirstOrThrow({
//     ...EcommerceMallAdminPromotionRequestSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallAdminPromotionRequestSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------