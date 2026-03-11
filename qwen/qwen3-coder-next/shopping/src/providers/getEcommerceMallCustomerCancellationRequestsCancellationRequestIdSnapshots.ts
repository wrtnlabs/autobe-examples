import { IArrayIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IArrayIEcommerceMallCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ArrayIEcommerceMallCancellationRequestSnapshotTransformer } from "../transformers/ArrayIEcommerceMallCancellationRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerCancellationRequestsCancellationRequestIdSnapshots(props: {
  customer: CustomerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<IArrayIEcommerceMallCancellationRequestSnapshot> {
  const request =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: { customer_id: true },
      },
    );
  if (request.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
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
  const transformed = await ArrayUtil.asyncMap(
    snapshots,
    ArrayIEcommerceMallCancellationRequestSnapshotTransformer.transform,
  );
  return {
    value: JSON.stringify(transformed.map((s) => JSON.parse(s.value))),
  };
}
