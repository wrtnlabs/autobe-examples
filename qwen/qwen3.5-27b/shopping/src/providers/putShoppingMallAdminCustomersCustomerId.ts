import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCustomerTransformer } from "../transformers/ShoppingMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminCustomersCustomerId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomer.IUpdate;
}): Promise<IShoppingMallCustomer> {
  const updateData: {
    display_name?: string;
    phone_number?: string | null;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.display_name !== undefined) {
    updateData.display_name = props.body.display_name;
  }
  if (props.body.phone_number !== undefined) {
    updateData.phone_number = props.body.phone_number;
  }
  const updated = await MyGlobal.prisma.shopping_mall_customers.update({
    where: {
      id: props.customerId,
      deleted_at: null,
    },
    data: updateData,
    ...ShoppingMallCustomerTransformer.select(),
  });
  return await ShoppingMallCustomerTransformer.transform(updated);
}
