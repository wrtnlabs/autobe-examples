import { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCustomerPasswordResetTransformer } from "../transformers/EcommerceMallCustomerPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminPasswordResetsResetId(props: {
  admin: AdminPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCustomerPasswordReset> {
  const passwordReset =
    await MyGlobal.prisma.ecommerce_mall_customer_password_resets.findUniqueOrThrow(
      {
        where: { id: props.resetId },
        ...EcommerceMallCustomerPasswordResetTransformer.select(),
      },
    );
  return EcommerceMallCustomerPasswordResetTransformer.transform(passwordReset);
}
