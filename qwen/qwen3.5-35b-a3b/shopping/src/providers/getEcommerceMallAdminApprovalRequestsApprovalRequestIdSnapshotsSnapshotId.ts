import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalSnapshot";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerApprovalSnapshotTransformer } from "../transformers/EcommerceMallSellerApprovalSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminApprovalRequestsApprovalRequestIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  approvalRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerApprovalSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...EcommerceMallSellerApprovalSnapshotTransformer.select(),
      },
    );
  // Validate that the approval request ID in path matches the snapshot's approval request
  if (snapshot.approvalRequest.id !== props.approvalRequestId) {
    throw new HttpException("Snapshot not found", 404);
  }
  return await EcommerceMallSellerApprovalSnapshotTransformer.transform(
    snapshot,
  );
}
