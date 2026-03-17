import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerCancellationRequestsRequestIdSnapshots(props: {
  customer: CustomerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IPageIShoppingMallCancellationRequestSnapshot.ISummary> {
  // Verify the cancellation request exists and belongs to the customer
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: {
          id: props.requestId,
          customer_id: props.customer.id,
          deleted_at: null,
        },
      },
    );
  // Query all snapshots for this cancellation request, ordered chronologically
  const snapshots =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findMany(
      {
        where: {
          cancellation_request_id: props.requestId,
        },
        orderBy: {
          created_at: "asc",
        },
        ...ShoppingMallCancellationRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  // Transform snapshots to DTO format
  const transformedData = await ArrayUtil.asyncMap(
    snapshots,
    ShoppingMallCancellationRequestSnapshotAtSummaryTransformer.transform,
  );
  // Return paginated response with all snapshots
  const limit = 100;
  const records = transformedData.length;
  const pages = records > 0 ? Math.ceil(records / limit) : 0;
  return {
    data: transformedData,
    pagination: {
      current: 1,
      limit: limit,
      records: records,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
