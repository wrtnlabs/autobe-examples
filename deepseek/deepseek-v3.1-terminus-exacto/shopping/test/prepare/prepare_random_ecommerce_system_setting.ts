import { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_system_setting(
  input?: DeepPartial<IEcommerceSystemSetting.ICreate>,
): IEcommerceSystemSetting.ICreate {
  const value_type =
    input?.value_type ??
    RandomGenerator.pick([
      "string",
      "boolean",
      "int",
      "double",
      "uri",
    ] as const);
  let setting_value: string;
  if (value_type === "string") {
    setting_value = input?.setting_value ?? RandomGenerator.alphabets(10);
  } else if (value_type === "boolean") {
    setting_value =
      input?.setting_value ?? (typia.random<boolean>() ? "true" : "false");
  } else if (value_type === "int") {
    setting_value =
      input?.setting_value ??
      typia.random<number & tags.Type<"int32">>().toString();
  } else if (value_type === "double") {
    setting_value =
      input?.setting_value ??
      typia.random<number & tags.Type<"double">>().toString();
  } else {
    // uri
    setting_value =
      input?.setting_value ?? typia.random<string & tags.Format<"uri">>();
  }
  return {
    setting_key:
      input?.setting_key ??
      RandomGenerator.pick([
        "payment.gateway.timeout",
        "inventory.restock.threshold",
        "user.session.timeout",
        "email.smtp.host",
        "cache.ttl.seconds",
        "search.page.size",
        "tax.rate.percentage",
      ] as const),
    value_type,
    setting_value,
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    is_active: input?.is_active ?? typia.random<boolean>(),
  };
}
