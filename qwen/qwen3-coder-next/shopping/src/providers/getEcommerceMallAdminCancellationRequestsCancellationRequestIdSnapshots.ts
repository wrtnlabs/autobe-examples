import { IArrayIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IArrayIEcommerceMallCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ArrayIEcommerceMallCancellationRequestSnapshotTransformer } from "../transformers/ArrayIEcommerceMallCancellationRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminCancellationRequestsCancellationRequestIdSnapshots(props: {
  admin: AdminPayload;
  cancellationRequestId: string;
}): Promise<IArrayIEcommerceMallCancellationRequestSnapshot> {
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany(
      {
        where: {
          ecommerce_mall_cancellation_request_id: props.cancellationRequestId,
        },
        orderBy: { created_at: "asc" },
        ...ArrayIEcommerceMallCancellationRequestSnapshotTransformer.select(),
      },
    );
  // The transformer returns an IArrayIEcommerceMallCancellationRequestSnapshot with value property containing JSON string
  // We need to map each snapshot individually and combine them into the array structure
  const snapshotValues = await ArrayUtil.asyncMap(
    snapshots,
    ArrayIEcommerceMallCancellationRequestSnapshotTransformer.transform,
  );
  // Extract the JSON values and parse them back to an array, then wrap in the expected structure
  const parsedSnapshots = snapshotValues.map((s) => JSON.parse(s.value));
  // Return as array of snapshots
  return {
    value: JSON.stringify(parsedSnapshots),
  };
}
