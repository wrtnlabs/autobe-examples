import { IArrayIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IArrayIEcommerceMallCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ArrayIEcommerceMallCancellationRequestSnapshotTransformer } from "../transformers/ArrayIEcommerceMallCancellationRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerCancellationRequestsCancellationRequestIdSnapshots(props: {
  seller: SellerPayload;
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
  return {
    value: JSON.stringify(
      await ArrayUtil.asyncMap(
        snapshots,
        ArrayIEcommerceMallCancellationRequestSnapshotTransformer.transform,
      ),
    ),
  };
}
