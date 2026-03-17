import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallCustomerTransformer } from "../transformers/ShoppingMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSuperAdminCustomersCustomerId(props: {
  superAdmin: SuperadminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomer.IUpdate;
}): Promise<IShoppingMallCustomer> {
  // Verify customer exists and is not deleted (throws 404 if not found)
  await MyGlobal.prisma.shopping_mall_customers.findFirstOrThrow({
    where: {
      id: props.customerId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Update mutable profile fields
  await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.customerId },
    data: {
      nickname: props.body.nickname,
      phone: props.body.phone,
      updated_at: new Date(),
    },
  });
  // Fetch and return updated record via transformer
  const updated =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.customerId },
      ...ShoppingMallCustomerTransformer.select(),
    });
  return ShoppingMallCustomerTransformer.transform(updated);
}
