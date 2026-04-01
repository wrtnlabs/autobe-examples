import { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallNotificationTransformer {
  export type Payload = Prisma.ecommerce_mall_notificationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        body: true,
        type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        recipients: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_notification_recipientsFindManyArgs,
        customerReference: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_notification_of_customersFindManyArgs,
        sellerRef: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_notification_of_sellersFindManyArgs,
        adminReference: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_notification_of_adminsFindManyArgs,
        notificationOfSuperAdmin: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_notification_of_super_adminsFindManyArgs,
        guestReference: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_notification_of_guestsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_notificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallNotification> {
    return {
      id: input.id,
      title: input.title,
      body: input.body,
      type: input.type,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
