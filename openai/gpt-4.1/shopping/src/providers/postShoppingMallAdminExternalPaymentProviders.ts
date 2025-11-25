import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallExternalPaymentProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallExternalPaymentProvider";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminExternalPaymentProviders(props: {
  admin: AdminPayload;
  body: IShoppingMallExternalPaymentProvider.ICreate;
}): Promise<IShoppingMallExternalPaymentProvider> {
  try {
    const now = toISOStringSafe(new Date());
    const created =
      await MyGlobal.prisma.shopping_mall_external_payment_providers.create({
        data: {
          id: v4(),
          provider_name: props.body.provider_name,
          provider_code: props.body.provider_code,
          status: props.body.status,
          description: props.body.description,
          created_at: now,
          updated_at: now,
        },
      });
    return {
      id: created.id,
      provider_name: created.provider_name,
      provider_code: created.provider_code,
      status: created.status,
      description: created.description,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at === null || typeof created.deleted_at === "undefined"
          ? null
          : toISOStringSafe(created.deleted_at),
    };
  } catch (error: any) {
    if (error.code === "P2002" && typeof error.code === "string") {
      throw new HttpException(
        "provider_name or provider_code already exists.",
        409,
      );
    }
    throw error;
  }
}
