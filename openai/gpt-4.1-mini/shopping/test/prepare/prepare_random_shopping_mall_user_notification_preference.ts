import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_user_notification_preference(
  input?:
    | DeepPartial<IShoppingMallUserNotificationPreference.ICreate>
    | undefined,
): IShoppingMallUserNotificationPreference.ICreate {
  input;
  return {};
}
