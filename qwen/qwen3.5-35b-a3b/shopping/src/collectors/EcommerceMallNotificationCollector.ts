import { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallNotificationCollector {
  export async function collect(props: {
    body: IEcommerceMallNotification.ICreate;
  }) {
    const id: string = crypto.randomUUID();
    // Categorize recipients by actor type - accessing actual IDeliver properties
    const customerRecipients = props.body.recipients.filter(
      (r) => "recipient_type" in r && (r as any).recipient_type === "customer",
    );
    const sellerRecipients = props.body.recipients.filter(
      (r) => "recipient_type" in r && (r as any).recipient_type === "seller",
    );
    const adminRecipients = props.body.recipients.filter(
      (r) => "recipient_type" in r && (r as any).recipient_type === "admin",
    );
    const superAdminRecipients = props.body.recipients.filter(
      (r) =>
        "recipient_type" in r && (r as any).recipient_type === "superAdmin",
    );
    const guestRecipients = props.body.recipients.filter(
      (r) => "recipient_type" in r && (r as any).recipient_type === "guest",
    );
    const now = new Date().toISOString();
    const customerIds = customerRecipients.map((r: any) => ({
      id: crypto.randomUUID(),
      notification_id: id,
      customer_id: r.id,
      created_at: now,
      updated_at: now,
      customer: {
        connect: { id: r.id },
      },
    }));
    const sellerIds = sellerRecipients.map((r: any) => ({
      id: crypto.randomUUID(),
      notification_id: id,
      seller_id: r.id,
      created_at: now,
      updated_at: now,
      seller: {
        connect: { id: r.id },
      },
    }));
    const adminIds = adminRecipients.map((r: any) => ({
      id: crypto.randomUUID(),
      notification_id: id,
      admin_id: r.id,
      created_at: now,
      updated_at: now,
      admin: {
        connect: { id: r.id },
      },
    }));
    const superAdminIds = superAdminRecipients.map((r: any) => ({
      id: crypto.randomUUID(),
      notification_id: id,
      super_admin_id: r.id,
      created_at: now,
      updated_at: now,
      superAdmin: {
        connect: { id: r.id },
      },
    }));
    const guestIds = guestRecipients.map((r: any) => ({
      id: crypto.randomUUID(),
      notification_id: id,
      guest_id: r.id,
      created_at: now,
      updated_at: now,
      guest: {
        connect: { id: r.id },
      },
    }));
    return {
      id,
      title: props.body.title,
      body: props.body.body,
      type: props.body.type,
      status: "unread",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      recipients: {
        create: await ArrayUtil.asyncMap(
          props.body.recipients,
          async (recipient: any) => ({
            id: crypto.randomUUID(),
            notification_id: id,
            recipient_type: recipient.recipient_type,
            recipient_id: recipient.recipient_id,
            read_status: "unread",
            created_at: now,
            updated_at: now,
          }),
        ),
      },
      customerReference:
        customerIds.length > 0 ? { create: customerIds[0] } : undefined,
      sellerRef: sellerIds.length > 0 ? { create: sellerIds[0] } : undefined,
      adminReference: adminIds.length > 0 ? { create: adminIds[0] } : undefined,
      notificationOfSuperAdmin:
        superAdminIds.length > 0 ? { create: superAdminIds[0] } : undefined,
      guestReference: guestIds.length > 0 ? { create: guestIds[0] } : undefined,
    } satisfies Prisma.ecommerce_mall_notificationsCreateInput;
  }
}
