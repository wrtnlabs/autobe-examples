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

export async function putShoppingMallAdminExternalPaymentProvidersProviderCode(props: {
  admin: AdminPayload;
  providerCode: string;
  body: IShoppingMallExternalPaymentProvider.IUpdate;
}): Promise<IShoppingMallExternalPaymentProvider> {
  // Find provider by provider_code
  const provider =
    await MyGlobal.prisma.shopping_mall_external_payment_providers.findUnique({
      where: { provider_code: props.providerCode },
    });
  if (!provider) {
    throw new HttpException("Payment provider not found", 404);
  }

  // Update only allowed fields, never id or provider_code
  try {
    const updated =
      await MyGlobal.prisma.shopping_mall_external_payment_providers.update({
        where: { provider_code: props.providerCode },
        data: {
          provider_name: props.body.provider_name,
          status: props.body.status,
          description: props.body.description,
          updated_at: toISOStringSafe(new Date()),
        },
      });
    return {
      id: updated.id,
      provider_name: updated.provider_name,
      provider_code: updated.provider_code,
      status: updated.status,
      description: updated.description,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at:
        updated.deleted_at === null || updated.deleted_at === undefined
          ? undefined
          : toISOStringSafe(updated.deleted_at),
    };
  } catch (error: any) {
    if (error.code === "P2002") {
      // Unique constraint violation
      throw new HttpException("Provider name or code must be unique", 409);
    }
    throw new HttpException("Failed to update provider", 400);
  }
}
