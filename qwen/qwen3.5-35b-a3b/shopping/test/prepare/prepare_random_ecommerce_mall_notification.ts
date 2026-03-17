import { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_notification(
  input?: DeepPartial<IEcommerceMallNotification.ICreate> | undefined,
): IEcommerceMallNotification.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    body: input?.body ?? RandomGenerator.content({ paragraphs: 2 }),
    type:
      input?.type ??
      RandomGenerator.pick([
        "order_update",
        "seller_approval",
        "platform_announcement",
        "system_alert",
        "cancellation_decision",
        "refund_decision",
        "shipment_update",
      ] as const),
    recipients: input?.recipients
      ? input.recipients.map((recipient) => ({
          title:
            recipient?.title ?? RandomGenerator.paragraph({ sentences: 1 }),
          body: recipient?.body ?? RandomGenerator.content({ paragraphs: 1 }),
          type:
            recipient?.type ??
            RandomGenerator.pick([
              "order_update",
              "seller_approval",
              "platform_announcement",
              "system_alert",
            ] as const),
          recipients: recipient?.recipients
            ? recipient.recipients.map((r) => ({
                recipient_type:
                  r?.recipient_type ??
                  RandomGenerator.pick([
                    "customer",
                    "seller",
                    "admin",
                    "superAdmin",
                    "guest",
                  ] as const),
                recipient_id:
                  r?.recipient_id ??
                  typia.random<string & tags.Format<"uuid">>(),
              }))
            : ArrayUtil.repeat(
                typia.random<
                  number &
                    tags.Type<"uint32"> &
                    tags.Minimum<1> &
                    tags.Maximum<3>
                >(),
                () => ({
                  recipient_type: RandomGenerator.pick([
                    "customer",
                    "seller",
                    "admin",
                    "superAdmin",
                    "guest",
                  ] as const),
                  recipient_id: typia.random<string & tags.Format<"uuid">>(),
                }),
              ),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            title: RandomGenerator.paragraph({ sentences: 1 }),
            body: RandomGenerator.content({ paragraphs: 1 }),
            type: RandomGenerator.pick([
              "order_update",
              "seller_approval",
              "platform_announcement",
              "system_alert",
            ] as const),
            recipients: ArrayUtil.repeat(
              typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
              >(),
              () => ({
                recipient_type: RandomGenerator.pick([
                  "customer",
                  "seller",
                  "admin",
                  "superAdmin",
                  "guest",
                ] as const),
                recipient_id: typia.random<string & tags.Format<"uuid">>(),
              }),
            ),
          }),
        ),
  };
}
