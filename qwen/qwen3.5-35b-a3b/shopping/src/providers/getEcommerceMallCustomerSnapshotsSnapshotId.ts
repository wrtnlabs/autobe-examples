import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshot";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallSnapshotTransformer } from "../transformers/EcommerceMallSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...EcommerceMallSnapshotTransformer.select(),
    });
  const actorId = snapshot.actor?.id ?? undefined;
  if (actorId === props.customer.id) {
    return await EcommerceMallSnapshotTransformer.transform(snapshot);
  }
  const entityType = snapshot.entity_type;
  const entityId = snapshot.entity.id;
  if (
    entityType === "review" ||
    entityType === "cancellation_request" ||
    entityType === "refund_request"
  ) {
    const relatedData = await MyGlobal.prisma.ecommerce_mall_reviews.findFirst({
      where: { id: entityId, customer: { id: props.customer.id } },
      select: { id: true },
    });
    if (relatedData) {
      return await EcommerceMallSnapshotTransformer.transform(snapshot);
    }
  }
  if (
    entityType === "product" ||
    entityType === "product_variant" ||
    entityType === "cancellation_request" ||
    entityType === "refund_request"
  ) {
    const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
      where: { id: entityId },
      select: { id: true, seller_id: true },
    });
    if (product) {
      return await EcommerceMallSnapshotTransformer.transform(snapshot);
    }
  }
  throw new HttpException("Forbidden", 403);
}
