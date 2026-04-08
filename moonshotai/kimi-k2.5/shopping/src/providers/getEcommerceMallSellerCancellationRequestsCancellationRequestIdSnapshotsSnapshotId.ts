import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallCancellationRequestSnapshotTransformer } from "../transformers/EcommerceMallCancellationRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerCancellationRequestsCancellationRequestIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCancellationRequestSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findFirstOrThrow(
      {
        ...EcommerceMallCancellationRequestSnapshotTransformer.select(),
        where: {
          id: props.snapshotId,
          cancellation_request_id: props.cancellationRequestId,
        },
      },
    );
  return await EcommerceMallCancellationRequestSnapshotTransformer.transform(
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
// import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerCancellationRequestsCancellationRequestIdSnapshotsSnapshotId(props: {
//   seller: SellerPayload;
//   cancellationRequestId: string;
//   snapshotId: string;
// }): Promise<IEcommerceMallCancellationRequestSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findFirstOrThrow({
//     ...EcommerceMallCancellationRequestSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCancellationRequestSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------