import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import { IMallPlatformAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformAdministratorApprovalRequestSnapshotTransformer } from "../transformers/MallPlatformAdministratorApprovalRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformAdministratorAdministratorApprovalRequestSnapshotsAdministratorApprovalRequestSnapshotId(props: {
  administrator: AdministratorPayload;
  administratorApprovalRequestSnapshotId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformAdministratorApprovalRequestSnapshot> {
  const record =
    await MyGlobal.prisma.mall_platform_administrator_approval_request_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.administratorApprovalRequestSnapshotId,
        },
        ...MallPlatformAdministratorApprovalRequestSnapshotTransformer.select(),
      },
    );
  return await MallPlatformAdministratorApprovalRequestSnapshotTransformer.transform(
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
// import { IMallPlatformAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequestSnapshot";
// import { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
// import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getMallPlatformAdministratorAdministratorApprovalRequestSnapshotsAdministratorApprovalRequestSnapshotId(props: {
//   administrator: AdministratorPayload;
//   administratorApprovalRequestSnapshotId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformAdministratorApprovalRequestSnapshot> {
//   const record = await MyGlobal.prisma.mall_platform_administrator_approval_request_snapshots.findFirstOrThrow({
//     ...MallPlatformAdministratorApprovalRequestSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformAdministratorApprovalRequestSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------