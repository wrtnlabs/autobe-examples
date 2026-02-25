import { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCartItemAtSummaryTransformer } from "../transformers/EcommerceCartItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IEcommerceCartItem.IRequest;
}): Promise<IPageIEcommerceCartItem.ISummary> {
  try {
    // Validate cart ownership
    const cart = await MyGlobal.prisma.ecommerce_shopping_carts.findUnique({
      where: { id: props.cartId },
      select: { customer_id: true },
    });
    if (!cart) {
      throw new HttpException("Cart not found", 404);
    }
    if (cart.customer_id !== props.customer.id) {
      throw new HttpException("Forbidden", 403);
    }
    // Build WHERE clause
    const whereInput: Prisma.ecommerce_cart_itemsWhereInput = {
      shopping_cart_id: props.cartId,
      deleted_at: null,
    };
    // Apply filters
    if (props.body.product_id) {
      whereInput.product_id = props.body.product_id;
    }
    if (props.body.product_variant_id) {
      whereInput.product_variant_id = props.body.product_variant_id;
    }
    // Pagination setup
    const page = props.body.page ?? 1;
    const limit = Math.min(props.body.limit ?? 100, 100); // Cap at 100
    const skip = (page - 1) * limit;
    // Sort setup
    const orderByInput: Prisma.ecommerce_cart_itemsOrderByWithRelationInput =
      {};
    if (props.body.sort === "created_at") {
      orderByInput.created_at = "desc";
    } else if (props.body.sort === "quantity") {
      orderByInput.quantity = "desc";
    } else {
      orderByInput.created_at = "desc"; // default sort
    }
    // Get paginated data
    const [data, total] = await Promise.all([
      MyGlobal.prisma.ecommerce_cart_items.findMany({
        where: whereInput,
        skip,
        take: limit,
        orderBy: orderByInput,
        ...EcommerceCartItemAtSummaryTransformer.select(),
      }),
      MyGlobal.prisma.ecommerce_cart_items.count({
        where: whereInput,
      }),
    ]);
    // Transform data
    const transformedData = await ArrayUtil.asyncMap(
      data,
      EcommerceCartItemAtSummaryTransformer.transform,
    );
    // Return paginated response
    return {
      data: transformedData,
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    };
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new HttpException("Internal server error", 500);
  }
}
