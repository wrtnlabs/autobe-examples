import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberOrdersOrderId(props: {
  member: MemberPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrder> {
  try {
    const memberType: unknown = (
      props.member as {
        type?: unknown;
      }
    ).type;
    const shoppingCustomerId =
      memberType === "admin"
        ? undefined
        : (props.member as unknown as IShoppingMallMember).id;
    const whereInput = {
      id: props.orderId,
      deleted_at: null,
      ...(memberType === "admin"
        ? {}
        : { shopping_customer_id: shoppingCustomerId }),
    };
    const order = await MyGlobal.prisma.shopping_mall_orders.findFirstOrThrow({
      where: whereInput,
      ...ShoppingMallOrderTransformer.select(),
    });
    return await ShoppingMallOrderTransformer.transform(order);
  } catch (e) {
    const status = (
      e as
        | {
            status?: number;
            statusCode?: number;
          }
        | undefined
    )?.status;
    const statusCode = (
      e as
        | {
            status?: number;
            statusCode?: number;
          }
        | undefined
    )?.statusCode;
    if (typeof status === "number" || typeof statusCode === "number") {
      throw e;
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
