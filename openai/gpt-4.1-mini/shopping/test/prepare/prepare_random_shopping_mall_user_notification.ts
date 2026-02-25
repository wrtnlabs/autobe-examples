import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_user_notification(
  input?: DeepPartial<IShoppingMallUserNotification.ICreate>,
): IShoppingMallUserNotification.ICreate {
  return {
    notificationTemplateId:
      input?.notificationTemplateId ??
      typia.random<string & tags.Format<"uuid">>(),
    ownerId: input?.ownerId ?? typia.random<string & tags.Format<"uuid">>(),
    ownerType:
      input?.ownerType ??
      RandomGenerator.pick(["customer", "seller", "administrator"] as const),
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    body: input?.body ?? RandomGenerator.content({ paragraphs: 2 }),
    url: (input?.hasOwnProperty("url") ?? false)
      ? (input!.url ?? null)
      : typia.random<string & tags.Format<"url">>(),
    imageUrl: (input?.hasOwnProperty("imageUrl") ?? false)
      ? (input!.imageUrl ?? null)
      : typia.random<string & tags.Format<"url">>(),
    isRead: input?.isRead ?? RandomGenerator.pick([true, false]),
    deliveredAt: (input?.hasOwnProperty("deliveredAt") ?? false)
      ? (input!.deliveredAt ?? null)
      : new Date(
          RandomGenerator.date(
            new Date(2020, 0, 1),
            Date.now() - new Date(2020, 0, 1).getTime(),
          ),
        ).toISOString(),
    readAt: (input?.hasOwnProperty("readAt") ?? false)
      ? (input!.readAt ?? null)
      : new Date(
          RandomGenerator.date(
            new Date(2020, 0, 1),
            Date.now() - new Date(2020, 0, 1).getTime(),
          ),
        ).toISOString(),
    updatedAt: (input?.hasOwnProperty("updatedAt") ?? false)
      ? (input!.updatedAt ?? null)
      : new Date(
          RandomGenerator.date(
            new Date(2020, 0, 1),
            Date.now() - new Date(2020, 0, 1).getTime(),
          ),
        ).toISOString(),
    deletedAt: (input?.hasOwnProperty("deletedAt") ?? false)
      ? (input!.deletedAt ?? null)
      : null,
  };
}
