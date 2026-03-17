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
    const id: string = v4();
    const flatRecipients: Prisma.ecommerce_mall_notification_recipientsUncheckedCreateInput[] =
      props.body.recipients.flatMap(
        (recipient: IEcommerceMallNotification.IDeliver) =>
          recipient.recipients.map(
            (r: IEcommerceMallNotification.IDeliverRecipient) => ({
              id: v4(),
              notification_id: id,
              recipient_type: r.recipient_type,
              recipient_id: r.recipient_id,
              read_status: "unread",
              read_at: null,
              notified_at: null,
              created_at: new Date(),
              updated_at: new Date(),
            }),
          ),
      );
    return {
      id,
      title: props.body.title,
      body: props.body.body,
      type: props.body.type,
      status: "unread",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      recipients: flatRecipients.length
        ? {
            create: flatRecipients,
          }
        : undefined,
      customerReference: undefined,
      sellerRef: undefined,
      adminReference: undefined,
      notificationOfSuperAdmin: undefined,
      guestReference: undefined,
    } satisfies Prisma.ecommerce_mall_notificationsCreateInput;
  }
}
