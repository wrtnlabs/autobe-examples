import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequestSnapshot";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceCancellationRequestSnapshotTransformer } from "../transformers/EcommerceCancellationRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorCancellationRequestsCancellationRequestIdSnapshotsSnapshotId(props: {
  administrator: AdministratorPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCancellationRequestSnapshot> {
  // Verify administrator is active
  const admin = await MyGlobal.prisma.ecommerce_administrators.findFirst({
    where: { id: props.administrator.id, deleted_at: null },
  });
  if (!admin) {
    throw new HttpException(
      "Administrator account not found or deactivated",
      403,
    );
  }
  // Find the specific snapshot by ID with cancellation request relation and verify it belongs to the specified cancellation request
  const snapshot =
    await MyGlobal.prisma.ecommerce_cancellation_request_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
          ecommerce_cancellation_request_id: props.cancellationRequestId,
        },
        ...EcommerceCancellationRequestSnapshotTransformer.select(),
      },
    );
  // Transform and return the complete snapshot record
  return await EcommerceCancellationRequestSnapshotTransformer.transform(
    snapshot,
  );
}
