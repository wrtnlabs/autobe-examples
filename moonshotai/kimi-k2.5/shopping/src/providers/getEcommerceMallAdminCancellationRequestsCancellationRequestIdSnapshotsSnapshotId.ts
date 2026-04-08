import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCancellationRequestSnapshotTransformer } from "../transformers/EcommerceMallCancellationRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminCancellationRequestsCancellationRequestIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  cancellationRequestId: string;
  snapshotId: string;
}): Promise<IEcommerceMallCancellationRequestSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...EcommerceMallCancellationRequestSnapshotTransformer.select(),
      },
    );
  if (snapshot.cancellation_request_id !== props.cancellationRequestId) {
    throw new HttpException(
      "Snapshot does not belong to the specified cancellation request",
      404,
    );
  }
  return await EcommerceMallCancellationRequestSnapshotTransformer.transform(
    snapshot,
  );
}
