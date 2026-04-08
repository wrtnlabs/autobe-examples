import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEcommerceMallSellerApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallSellerApprovalRequestSnapshotTransformer } from "../transformers/EcommerceMallSellerApprovalRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdministratorSellerApprovalRequestSnapshotsSnapshotId(props: {
  administrator: AdministratorPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerApprovalRequestSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_request_snapshots.findFirstOrThrow(
      {
        ...EcommerceMallSellerApprovalRequestSnapshotTransformer.select(),
        where: { id: props.snapshotId },
      },
    );
  return await EcommerceMallSellerApprovalRequestSnapshotTransformer.transform(
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
// import { IEcommerceMallSellerApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequestSnapshot";
// import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdministratorSellerApprovalRequestSnapshotsSnapshotId(props: {
//   administrator: AdministratorPayload;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallSellerApprovalRequestSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_approval_request_snapshots.findFirstOrThrow({
//     ...EcommerceMallSellerApprovalRequestSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerApprovalRequestSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------