import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductSnapshotCollector } from "../collectors/ShoppingMallProductSnapshotCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallProductSnapshotTransformer } from "../transformers/ShoppingMallProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminProductSnapshots(props: {
  admin: AdminPayload;
  body: IShoppingMallProductSnapshot.ICreate;
}): Promise<IShoppingMallProductSnapshot> {
  if (props.admin.type !== "admin") {
    throw new HttpException("Forbidden", 403);
  }
  const snapshotCode = props.body.snapshot_code;
  const sourceType = props.body.source_type;
  const reason = props.body.reason;
  if (snapshotCode.trim().length === 0) {
    throw new HttpException("snapshot_code is required", 400);
  }
  if (sourceType.trim().length === 0) {
    throw new HttpException("source_type is required", 400);
  }
  if (reason.trim().length === 0) {
    throw new HttpException("reason is required", 400);
  }
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validateOptionalUuid = (
    value: (string & tags.Format<"uuid">) | null | undefined,
    fieldName: string,
  ): void => {
    if (value == null) return;
    if (!uuidRegex.test(value)) {
      throw new HttpException(`${fieldName} must be a valid uuid`, 400);
    }
  };
  if (!uuidRegex.test(props.body.source_entity_id)) {
    throw new HttpException("source_entity_id must be a valid uuid", 400);
  }
  validateOptionalUuid(props.body.source_seller_id, "source_seller_id");
  validateOptionalUuid(props.body.source_order_id, "source_order_id");
  validateOptionalUuid(props.body.source_order_item_id, "source_order_item_id");
  validateOptionalUuid(props.body.source_review_id, "source_review_id");
  validateOptionalUuid(
    props.body.source_cancellation_request_id,
    "source_cancellation_request_id",
  );
  validateOptionalUuid(
    props.body.source_refund_request_id,
    "source_refund_request_id",
  );
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const data = await ShoppingMallProductSnapshotCollector.collect({
      body: props.body,
    });
    let created: {
      id: string & tags.Format<"uuid">;
    };
    try {
      const row = await tx.shopping_mall_snapshots.create({
        data,
      });
      created = { id: row.id };
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? (
              err as {
                code?: unknown;
              }
            ).code
          : undefined;
      if (code === "P2002") {
        throw new HttpException("snapshot_code already exists", 409);
      }
      throw new HttpException("Failed to create snapshot", 500);
    }
    const loaded = await tx.shopping_mall_product_snapshots.findUniqueOrThrow({
      where: { id: created.id },
      ...ShoppingMallProductSnapshotTransformer.select(),
    });
    return await ShoppingMallProductSnapshotTransformer.transform(loaded);
  });
}
