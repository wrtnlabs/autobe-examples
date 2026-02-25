import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_notification_template(
  input?: DeepPartial<IShoppingMallNotificationTemplate.ICreate>,
): IShoppingMallNotificationTemplate.ICreate {
  return {
    template_code: input?.template_code ?? RandomGenerator.alphaNumeric(16),
    template_name: input?.template_name ?? RandomGenerator.name(),
    content: input?.content ?? RandomGenerator.paragraph({ sentences: 4 }),
    parameters:
      input?.parameters ??
      JSON.stringify({
        userId: RandomGenerator.alphaNumeric(8),
        orderId: RandomGenerator.alphaNumeric(8),
        deliveryDate: new Date().toISOString(),
      }),
  };
}
