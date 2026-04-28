import { IEcommercePlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCancellationRequest";
import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import { IEcommercePlatformSnapshotCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotCancellationRequest";
import { IEcommercePlatformSnapshotOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotOrderItem";
import { IEcommercePlatformSnapshotProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotProduct";
import { IEcommercePlatformSnapshotRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotRefundRequest";
import { IEcommercePlatformSnapshotReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotReview";
import { IEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotSellerProfile";
import { IEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommercePlatformSnapshotTransformer } from "../transformers/EcommercePlatformSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommercePlatformAdminSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommercePlatformSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_platform_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
      },
      ...EcommercePlatformSnapshotTransformer.select(),
    });
  return await EcommercePlatformSnapshotTransformer.transform(record);
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
// import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
// import { IEcommercePlatformSnapshotProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotProduct";
// import { IEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariant";
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// import { IEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotSellerProfile";
// import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
// import { IEcommercePlatformSnapshotOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotOrderItem";
// import { IEcommercePlatformSnapshotReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotReview";
// import { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
// import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
// import { IEcommercePlatformSnapshotCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotCancellationRequest";
// import { IEcommercePlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCancellationRequest";
// import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
// import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
// import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
// import { IEcommercePlatformSnapshotRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotRefundRequest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommercePlatformAdminSnapshotsSnapshotId(props: {
//   admin: AdminPayload;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IEcommercePlatformSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_platform_snapshots.findFirstOrThrow({
//     ...EcommercePlatformSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommercePlatformSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------