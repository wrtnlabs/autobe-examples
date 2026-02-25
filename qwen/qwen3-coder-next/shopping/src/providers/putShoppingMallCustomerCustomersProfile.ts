import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerTransformer } from "../transformers/ShoppingMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerCustomersProfile(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomer.IUpdate;
}): Promise<IShoppingMallCustomer> {
  const updated = await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.customer.id },
    data: {
      display_name:
        props.body.display_name !== undefined &&
        props.body.display_name !== null
          ? props.body.display_name
          : undefined,
      phone_number:
        props.body.phone_number !== undefined &&
        props.body.phone_number !== null
          ? props.body.phone_number
          : undefined,
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
    ...ShoppingMallCustomerTransformer.select(),
  });
  return await ShoppingMallCustomerTransformer.transform(updated);
}
