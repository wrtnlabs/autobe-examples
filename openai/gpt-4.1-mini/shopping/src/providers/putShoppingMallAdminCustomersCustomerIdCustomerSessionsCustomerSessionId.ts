import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminCustomersCustomerIdCustomerSessionsCustomerSessionId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  customerSessionId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerSession.IUpdate;
}): Promise<IShoppingMallCustomerSession> {
  const existing =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findUnique({
      where: { id: props.customerSessionId },
    });

  if (!existing || existing.shopping_mall_customer_id !== props.customerId) {
    throw new HttpException("Customer session not found", 404);
  }

  const updateData: {
    ip?: string | undefined;
    href?: string | undefined;
    referrer?: string | undefined;
    expired_at?: string | null | undefined;
  } = {};

  if ("ip" in props.body) {
    updateData.ip = props.body.ip ?? undefined;
  }
  if ("href" in props.body) {
    updateData.href = props.body.href;
  }
  if ("referrer" in props.body) {
    updateData.referrer = props.body.referrer;
  }
  if ("expired_at" in props.body) {
    updateData.expired_at = props.body.expired_at ?? null;
  }

  const updated = await MyGlobal.prisma.shopping_mall_customer_sessions.update({
    where: { id: props.customerSessionId },
    data: updateData,
  });

  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    ip: updated.ip === null ? null : (updated.ip ?? undefined),
    href: updated.href ?? undefined,
    referrer: updated.referrer ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    expires_at:
      updated.expired_at !== null && updated.expired_at !== undefined
        ? toISOStringSafe(updated.expired_at)
        : "1970-01-01T00:00:00.000Z",
  } satisfies IShoppingMallCustomerSession;
}
