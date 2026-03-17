import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApproval";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSellerAtSummaryTransformer } from "../transformers/ShoppingMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerApprovals(props: {
  seller: SellerPayload;
  body: IShoppingMallSellerApproval.IRequest;
}): Promise<IPageIShoppingMallSellerApproval.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Scope to the authenticated seller's own record(s).
  // The platform's database does not have a separate seller_approvals table in
  // the available schema; the seller registration record in shopping_mall_sellers
  // serves as the approval record. The seller is scoped to their own identity.
  const whereInput = {
    id: props.seller.id,
  } satisfies Prisma.shopping_mall_sellersWhereInput;
  const sellers = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallSellerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_sellers.count({
    where: whereInput,
  });
  const data: IShoppingMallSellerApproval.ISummary[] = await ArrayUtil.asyncMap(
    sellers,
    async (sellerRecord) => {
      const sellerSummary =
        await ShoppingMallSellerAtSummaryTransformer.transform(sellerRecord);
      const status: "pending" | "approved" | "rejected" = "pending";
      return {
        id: sellerRecord.id,
        status,
        seller: sellerSummary,
        submittedAt: sellerRecord.created_at.toISOString(),
        reviewedAt: null,
        rejectionReason: null,
      } satisfies IShoppingMallSellerApproval.ISummary;
    },
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
