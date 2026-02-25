import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallCustomerEmailVerificationTransformer } from "../transformers/ShoppingMallCustomerEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorEmailVerificationsEmailVerificationId(props: {
  administrator: AdministratorPayload;
  emailVerificationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerEmailVerification> {
  const record =
    await MyGlobal.prisma.shopping_mall_customer_email_verifications.findUniqueOrThrow(
      {
        where: { id: props.emailVerificationId },
        ...ShoppingMallCustomerEmailVerificationTransformer.select(),
      },
    );
  return ShoppingMallCustomerEmailVerificationTransformer.transform(record);
}
