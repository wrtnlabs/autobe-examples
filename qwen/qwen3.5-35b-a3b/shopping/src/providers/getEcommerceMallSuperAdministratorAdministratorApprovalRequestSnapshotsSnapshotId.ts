import { IEcommerceMallAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceMallAdministratorApprovalRequestSnapshotTransformer } from "../transformers/EcommerceMallAdministratorApprovalRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getEcommerceMallSuperAdministratorAdministratorApprovalRequestSnapshotsSnapshotId(props: {
  superAdministrator: SuperadministratorPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdministratorApprovalRequestSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests_snapshots.findUniqueOrThrow(
      {
        ...EcommerceMallAdministratorApprovalRequestSnapshotTransformer.select(),
        where: { id: props.snapshotId },
      },
    );
  return await EcommerceMallAdministratorApprovalRequestSnapshotTransformer.transform(
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
// import { IEcommerceMallAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequestSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSuperAdministratorAdministratorApprovalRequestSnapshotsSnapshotId(props: {
//   superAdministrator: SuperadministratorPayload;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallAdministratorApprovalRequestSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests_snapshots.findFirstOrThrow({
//     ...EcommerceMallAdministratorApprovalRequestSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallAdministratorApprovalRequestSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------