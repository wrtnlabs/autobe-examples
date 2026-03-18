import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallSellerEmailVerificationTransformer } from "../transformers/ShoppingMallSellerEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerEmailVerificationsEmailVerificationId(props: {
  customer: CustomerPayload;
  emailVerificationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerEmailVerification> {
  const record =
    await MyGlobal.prisma.shopping_mall_customer_email_verifications.findUniqueOrThrow(
      {
        where: {
          id: props.emailVerificationId,
        },
        ...ShoppingMallSellerEmailVerificationTransformer.select(),
      },
    );
  return await ShoppingMallSellerEmailVerificationTransformer.transform(record);
}
