import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_user_notification_preference(
  input?: DeepPartial<IShoppingMallUserNotificationPreference.ICreate>,
): IShoppingMallUserNotificationPreference.ICreate {
  return {
    channelName: input?.channelName ?? RandomGenerator.name(),
    notificationType: input?.notificationType ?? RandomGenerator.name(),
    isEnabled: input?.isEnabled ?? typia.random<boolean>(),
    customerId:
      input?.customerId !== undefined
        ? input.customerId
        : (typia.random<string & tags.Format<"uuid">>() ?? null),
    sellerId:
      input?.sellerId !== undefined
        ? input.sellerId
        : (typia.random<string & tags.Format<"uuid">>() ?? null),
    administratorId:
      input?.administratorId !== undefined
        ? input.administratorId
        : (typia.random<string & tags.Format<"uuid">>() ?? null),
  };
}
