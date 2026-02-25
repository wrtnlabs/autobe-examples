import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallProductSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerSnapshots(props: {
  customer: CustomerPayload;
  body: IShoppingMallProductSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductSnapshot.ISummary> {
  const {
    entity_type,
    changed_by,
    from_date,
    to_date,
    status,
    page = 1,
    limit = 100,
  } = props.body;
  const skip = (page - 1) * limit;
  const take = limit;
  // Define the base query to fetch snapshots from all six entity types
  const snapshotsQuery = MyGlobal.prisma.$queryRaw`
    SELECT id as snapshot_id, 'product' as type, changed_at, changed_by_id as changed_by_id, version
    FROM shopping_mall_product_snapshots
    WHERE '${entity_type}' = 'product'
    ${changed_by ? sql`AND changed_by_id IN (SELECT id FROM shopping_mall_users WHERE user_type = ${changed_by})` : sql``}
    ${from_date ? sql`AND changed_at >= ${from_date}` : sql``}
    ${to_date ? sql`AND changed_at <= ${to_date}` : sql``}

    UNION ALL

    SELECT id as snapshot_id, 'variant' as type, changed_at, changed_by as changed_by_id, version
    FROM shopping_mall_product_variant_snapshots
    WHERE '${entity_type}' = 'variant'
    ${changed_by ? sql`AND changed_by IN (SELECT id FROM shopping_mall_users WHERE user_type = ${changed_by})` : sql``}
    ${from_date ? sql`AND changed_at >= ${from_date}` : sql``}
    ${to_date ? sql`AND changed_at <= ${to_date}` : sql``}

    UNION ALL

    SELECT id as snapshot_id, 'order_item' as type, created_at as changed_at, NULL as changed_by_id, 1 as version
    FROM shopping_mall_order_item_snapshots
    WHERE '${entity_type}' = 'order_item'
    ${from_date ? sql`AND created_at >= ${from_date}` : sql``}
    ${to_date ? sql`AND created_at <= ${to_date}` : sql``}

    UNION ALL

    SELECT id as snapshot_id, 'review' as type, changed_at, changed_by as changed_by_id, 1 as version
    FROM shopping_mall_review_snapshots
    WHERE '${entity_type}' = 'review'
    ${changed_by ? sql`AND changed_by IN (SELECT id FROM shopping_mall_users WHERE user_type = ${changed_by})` : sql``}
    ${from_date ? sql`AND changed_at >= ${from_date}` : sql``}
    ${to_date ? sql`AND changed_at <= ${to_date}` : sql``}

    UNION ALL

    SELECT id as snapshot_id, 'cancellation_request' as type, changed_at, changed_by as changed_by_id, 1 as version
    FROM shopping_mall_cancellation_request_snapshots
    WHERE '${entity_type}' = 'cancellation_request'
    ${changed_by ? sql`AND changed_by IN (SELECT id FROM shopping_mall_users WHERE user_type = ${changed_by})` : sql``}
    ${from_date ? sql`AND changed_at >= ${from_date}` : sql``}
    ${to_date ? sql`AND changed_at <= ${to_date}` : sql``}
    ${status ? sql`AND status = ${status}` : sql``}

    UNION ALL

    SELECT id as snapshot_id, 'refund_request' as type, changed_at, changed_by as changed_by_id, version
    FROM shopping_mall_refund_request_snapshots
    WHERE '${entity_type}' = 'refund_request'
    ${changed_by ? sql`AND changed_by IN (SELECT id FROM shopping_mall_users WHERE user_type = ${changed_by})` : sql``}
    ${from_date ? sql`AND changed_at >= ${from_date}` : sql``}
    ${to_date ? sql`AND changed_at <= ${to_date}` : sql``}
    ${status ? sql`AND status = ${status}` : sql``}

    ORDER BY changed_at DESC
    OFFSET ${skip}
    LIMIT ${take}
  `;
  // Execute the unified query
  const snapshots = await snapshotsQuery;
  // Get total count for pagination
  const totalCountQuery = MyGlobal.prisma.$queryRaw`
    SELECT COUNT(*)::INT as total FROM (
      SELECT id FROM shopping_mall_product_snapshots
      WHERE '${entity_type}' = 'product'
      ${changed_by ? sql`AND changed_by_id IN (SELECT id FROM shopping_mall_users WHERE user_type = ${changed_by})` : sql``}
      ${from_date ? sql`AND changed_at >= ${from_date}` : sql``}
      ${to_date ? sql`AND changed_at <= ${to_date}` : sql``}

      UNION ALL

      SELECT id FROM shopping_mall_product_variant_snapshots
      WHERE '${entity_type}' = 'variant'
      ${changed_by ? sql`AND changed_by IN (SELECT id FROM shopping_mall_users WHERE user_type = ${changed_by})` : sql``}
      ${from_date ? sql`AND changed_at >= ${from_date}` : sql``}
      ${to_date ? sql`AND changed_at <= ${to_date}` : sql``}

      UNION ALL

      SELECT id FROM shopping_mall_order_item_snapshots
      WHERE '${entity_type}' = 'order_item'
      ${from_date ? sql`AND created_at >= ${from_date}` : sql``}
      ${to_date ? sql`AND created_at <= ${to_date}` : sql``}

      UNION ALL

      SELECT id FROM shopping_mall_review_snapshots
      WHERE '${entity_type}' = 'review'
      ${changed_by ? sql`AND changed_by IN (SELECT id FROM shopping_mall_users WHERE user_type = ${changed_by})` : sql``}
      ${from_date ? sql`AND changed_at >= ${from_date}` : sql``}
      ${to_date ? sql`AND changed_at <= ${to_date}` : sql``}

      UNION ALL

      SELECT id FROM shopping_mall_cancellation_request_snapshots
      WHERE '${entity_type}' = 'cancellation_request'
      ${changed_by ? sql`AND changed_by IN (SELECT id FROM shopping_mall_users WHERE user_type = ${changed_by})` : sql``}
      ${from_date ? sql`AND changed_at >= ${from_date}` : sql``}
      ${to_date ? sql`AND changed_at <= ${to_date}` : sql``}
      ${status ? sql`AND status = ${status}` : sql``}

      UNION ALL

      SELECT id FROM shopping_mall_refund_request_snapshots
      WHERE '${entity_type}' = 'refund_request'
      ${changed_by ? sql`AND changed_by IN (SELECT id FROM shopping_mall_users WHERE user_type = ${changed_by})` : sql``}
      ${from_date ? sql`AND changed_at >= ${from_date}` : sql``}
      ${to_date ? sql`AND changed_at <= ${to_date}` : sql``}
      ${status ? sql`AND status = ${status}` : sql``}
    ) AS combined
  `;
  const totalCountResult = await totalCountQuery;
  const total = totalCountResult[0]?.total ?? 0;
  // Transform each snapshot into IShoppingMallProductSnapshot.ISummary
  // For each snapshot, we need to transform its changed_by_id into ISummary
  const data = await ArrayUtil.asyncMap(snapshots, async (snapshot) => {
    // Get actor summary from changed_by_id (only applicable for entity_types with changed_by_id)
    let actorSummary = null;
    if (snapshot.changed_by_id) {
      const actor = await MyGlobal.prisma.shopping_mall_users.findUniqueOrThrow(
        {
          where: { id: snapshot.changed_by_id },
          select: { id: true, status: true },
        },
      );
      actorSummary =
        await ShoppingMallProductSnapshotAtSummaryTransformer.transform(actor);
    }
    // Build the snapshot summary object
    return {
      id: snapshot.snapshot_id as string & tags.Format<"uuid">,
      type: snapshot.type as
        | "product"
        | "variant"
        | "order_item"
        | "review"
        | "cancellation_request"
        | "refund_request",
      changed_at: snapshot.changed_at.toISOString() as string &
        tags.Format<"date-time">,
      changed_by: actorSummary,
      version: snapshot.version,
    };
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
