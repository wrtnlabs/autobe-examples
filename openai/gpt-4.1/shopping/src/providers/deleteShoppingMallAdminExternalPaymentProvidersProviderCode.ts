import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallExternalPaymentProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallExternalPaymentProvider";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminExternalPaymentProvidersProviderCode(props: {
  admin: AdminPayload;
  providerCode: string;
}): Promise<IShoppingMallExternalPaymentProvider> {
  const provider =
    await MyGlobal.prisma.shopping_mall_external_payment_providers.findUnique({
      where: { provider_code: props.providerCode },
    });

  if (!provider) {
    throw new HttpException("External payment provider not found.", 404);
  }

  const now = toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.shopping_mall_external_payment_providers.update({
      where: { provider_code: props.providerCode },
      data: { deleted_at: now, updated_at: now },
    });

  return {
    id: updated.id,
    provider_name: updated.provider_name,
    provider_code: updated.provider_code,
    status: updated.status,
    description: updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
