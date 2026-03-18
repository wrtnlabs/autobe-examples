import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerEmailVerificationTransformer } from "../transformers/ShoppingMallCustomerEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerEmailVerifications(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerEmailVerification.IRequest;
}): Promise<IShoppingMallCustomerEmailVerification> {
  const now = new Date();
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    const verified =
      await prisma.shopping_mall_customer_email_verifications.findFirst({
        where: {
          token: props.body.token,
          shopping_mall_customer_id: props.customer.id,
          verified_at: null,
          expired_at: {
            gt: now,
          },
          deleted_at: null,
        },
        select: {
          id: true,
          shopping_mall_customer_id: true,
          token: true,
          sent_at: true,
          verified_at: true,
          expired_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
    if (verified === null) {
      throw new HttpException("Invalid verification token", 400);
    }
    const row = await prisma.shopping_mall_customer_email_verifications.update({
      where: {
        id: verified.id,
      },
      data: {
        verified_at: now,
        updated_at: now,
      },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        token: true,
        sent_at: true,
        verified_at: true,
        expired_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    return row;
  });
  return ShoppingMallCustomerEmailVerificationTransformer.transform(updated);
}
