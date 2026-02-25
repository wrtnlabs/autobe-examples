import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe"

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload"

export async function patchShoppingMallSellerSnapshots(props: {
    seller: SellerPayload;
    body: IShoppingMallProductSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductSnapshot.ISum> {
    const { entity_type, changed_by, from_date, to_date, status, page = 1, limit = 100 } = props.body;
    // Validate required filter
    if (!entity_type)
        throw new HttpException('entity_type is required', 400);
    const skip = (page - 1) * limit;
    // Define base SELECT structure for each snapshot
    const queryParts: ReturnType<typeof getSnapshotQuery>[] = [];
    // Helper to build snapshot query
    function getSnapshotQuery(table: 'shopping_mall_product_snapshots' | 'shopping_mall_product_variant_snapshots' | 'shopping_mall_order_item_snapshots' | 'shopping_mall_review_snapshots' | 'shopping_mall_cancellation_request_snapshots' | 'shopping_mall_refund_request_snapshots', type: 'product' | 'variant' | 'order_item' | 'review' | 'cancellation_request' | 'refund_request', where: any = {}) {
        return MyGlobal.prisma.$queryRaw `
      SELECT 
        id,
        changed_at,
        changed_by,
        version,
        JSON_BUILD_OBJECT(
          'id', ${type === 'product' ? 'p.product_id' : type === 'variant' ? 'pv.variant_id' : type === 'order_item' ? 'oi.order_item_id' : type === 'review' ? 'r.review_id' : ;
        when;
        type = 'cancellation_request';
        then;
        'cs.cancellation_request_id';
        'rf.refund_request_id';
        end;
    }
    'name', $;
    {
        type === 'product' ? 'p.name' : 'NULL';
    }
    'base_price', $;
    {
        type === 'product' ? 'p.base_price' : 'NULL';
    }
    'category_id', $;
    {
        type === 'product' ? 'p.category_id' : 'NULL';
    }
    'sku_code', $;
    {
        type === 'variant' ? 'pv.sku_code' : 'NULL';
    }
    'price', $;
    {
        type === 'variant' ? 'pv.price' : 'NULL';
    }
    'stock_quantity', $;
    {
        type === 'variant' ? 'pv.stock_quantity' : 'NULL';
    }
    'content', $;
    {
        type === 'review' ? 'r.content' : 'NULL';
    }
    'rating', $;
    {
        type === 'review' ? 'r.rating' : 'NULL';
    }
    'reason', $;
    {
        type === 'cancellation_request' || type === 'refund_request' ? 'cs.reason' : 'NULL';
    }
    'status', $;
    {
        type === 'cancellation_request' || type === 'refund_request' ? 'cs.status' : 'NULL';
    }
    'response_reason', $;
    {
        type === 'cancellation_request' || type === 'refund_request' ? 'cs.response_reason' : 'NULL';
    }
    as;
    snapshot_data;
    FROM;
    $;
    {
        Prisma.raw(table);
    }
    cs;
    $;
    {
        type === 'product' ? 'JOIN shopping_mall_products p ON cs.product_id = p.id' : '';
    }
    $;
    {
        type === 'variant' ? 'JOIN shopping_mall_product_variants pv ON cs.product_variant_id = pv.id' : '';
    }
    $;
    {
        type === 'order_item' ? 'JOIN shopping_mall_order_items oi ON cs.order_item_id = oi.id' : '';
    }
    $;
    {
        type === 'review' ? 'JOIN shopping_mall_reviews r ON cs.review_id = r.id' : '';
    }
    $;
    {
        type === 'cancellation_request' ? 'JOIN shopping_mall_cancellation_requests cs ON cs.id = cs.cancellation_request_id' : '';
    }
    $;
    {
        type === 'refund_request' ? 'JOIN shopping_mall_refund_requests rf ON rf.id = cs.refund_request_id' : '';
    }
    WHERE;
    cs.changed_at >= COALESCE($, { from_date }, '1970-01-01', timestamp);
    AND;
    cs.changed_at <= COALESCE($, { to_date }, '9999-12-31', timestamp);
    AND($, { changed_by, 'cs.changed_by = $1': 'TRUE' });
    $;
    {
        status ? 'AND cs.status = $2' : '';
    }
    AND;
    cs.status = $;
    {
        type === 'cancellation_request' || type === 'refund_request' ? status : 'pending';
    }
    `;
  }

  // Add query for entity_type or all if not specified
  if (!entity_type) {
    queryParts.push(getSnapshotQuery('shopping_mall_product_snapshots', 'product'));
    queryParts.push(getSnapshotQuery('shopping_mall_product_variant_snapshots', 'variant'));
    queryParts.push(getSnapshotQuery('shopping_mall_order_item_snapshots', 'order_item'));
    queryParts.push(getSnapshotQuery('shopping_mall_review_snapshots', 'review'));
    queryParts.push(getSnapshotQuery('shopping_mall_cancellation_request_snapshots', 'cancellation_request'));
    queryParts.push(getSnapshotQuery('shopping_mall_refund_request_snapshots', 'refund_request'));
  } else {
    switch (entity_type) {
      case 'product':
        queryParts.push(getSnapshotQuery('shopping_mall_product_snapshots', 'product'));
        break;
      case 'variant':
        queryParts.push(getSnapshotQuery('shopping_mall_product_variant_snapshots', 'variant'));
        break;
      case 'order_item':
        queryParts.push(getSnapshotQuery('shopping_mall_order_item_snapshots', 'order_item'));
        break;
      case 'review':
        queryParts.push(getSnapshotQuery('shopping_mall_review_snapshots', 'review'));
        break;
      case 'cancellation_request':
        queryParts.push(getSnapshotQuery('shopping_mall_cancellation_request_snapshots', 'cancellation_request'));
        break;
      case 'refund_request':
        queryParts.push(getSnapshotQuery('shopping_mall_refund_request_snapshots', 'refund_request'));
        break;
    }
  }

  // Build UNION ALL query with LIMIT and OFFSET
  const fullQuery = \`
    SELECT 
      id,
      changed_at,
      changed_by,
      version,
      snapshot_data
    FROM (
      ${queryParts.map(q => q.toString()).join(' UNION ALL 
      ')}
    ) AS combined
    ORDER BY changed_at DESC
    LIMIT ${limit}
    OFFSET ${skip}
  \`;

  const results = await MyGlobal.prisma.$queryRaw<any>(fullQuery);

  // Transform to IShoppingMallProductSnapshot.ISum
  const transformed = results.map(rec => ({
    type: entity_type as any as "product" | "variant" | "order_item" | "review" | "cancellation_request" | "refund_request",
    changed_at: rec.changed_at as string & tags.Format<'date-time'>,
    changed_by: rec.changed_by as any as "customer" | "seller" | "admin",
    version: rec.version as number & tags.Type<'int32'>,
    snapshot_data: rec.snapshot_data as {
      id: string & tags.Format<'uuid'>;
      name: string;
      base_price: number;
      category_id: string & tags.Format<'uuid'>;
      sku_code?: string;
      price?: number;
      stock_quantity?: number;
      content?: string;
      rating?: number;
      reason?: string;
      status?: "pending" | "approved" | "rejected";
      response_reason?: string;
    }
  }) satisfies IShoppingMallProductSnapshot.ISum);

  // Count total records
  const countQuery = \`
    SELECT COUNT(*) as total
    FROM (
      ${queryParts.map(q => q.toString()).join(' UNION ALL 
      ')}
    ) AS combined
  \`;
  const totalResult = await MyGlobal.prisma.$queryRaw<{ total: string }>(countQuery);
  const records = parseInt(totalResult[0].total);
  const pages = Math.ceil(records / limit);

  return {
    data: transformed,
    pagination: {
      current: page,
      limit,
      records,
      pages
    } satisfies IPage.IPagination
  };;
}
