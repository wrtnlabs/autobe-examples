import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCancellationRequestTransformer } from "../transformers/ShoppingMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerCancellationRequestsCancellationRequestId(props: {
  customer: CustomerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCancellationRequest> {
  const recordRaw =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        ...ShoppingMallCancellationRequestTransformer.select(),
      },
    );
  if (recordRaw.customer.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  function convertDate(date: Date | null | undefined): string | null {
    return date
      ? (date.toISOString() as string & tags.Format<"date-time">)
      : null;
  }
  function convertDatesInCustomer(customer: typeof recordRaw.customer) {
    return {
      ...customer,
      created_at: convertDate(customer.created_at),
      updated_at: convertDate(customer.updated_at),
      deleted_at: convertDate(customer.deleted_at),
    };
  }
  function convertDatesInOrderItem(orderItem: typeof recordRaw.orderItem) {
    return {
      ...orderItem,
      created_at: convertDate(orderItem.created_at),
      updated_at: convertDate(orderItem.updated_at),
      deleted_at: convertDate(orderItem.deleted_at),
      order: {
        ...orderItem.order,
        created_at: convertDate(orderItem.order.created_at),
        updated_at: convertDate(orderItem.order.updated_at),
        deleted_at: convertDate(orderItem.order.deleted_at),
        customer: convertDatesInCustomer(orderItem.order.customer),
      },
      productVariant: {
        ...orderItem.productVariant,
        created_at: convertDate(orderItem.productVariant.created_at),
        updated_at: convertDate(orderItem.productVariant.updated_at),
        deleted_at: convertDate(orderItem.productVariant.deleted_at),
      },
    };
  }
  const recordForTransform = {
    ...recordRaw,
    requested_at: convertDate(recordRaw.requested_at),
    processed_at: convertDate(recordRaw.processed_at),
    created_at: convertDate(recordRaw.created_at),
    updated_at: convertDate(recordRaw.updated_at),
    deleted_at: convertDate(recordRaw.deleted_at),
    customer: convertDatesInCustomer(recordRaw.customer),
    orderItem: convertDatesInOrderItem(recordRaw.orderItem),
  };
  return await ShoppingMallCancellationRequestTransformer.transform(
    recordForTransform,
  );
}
