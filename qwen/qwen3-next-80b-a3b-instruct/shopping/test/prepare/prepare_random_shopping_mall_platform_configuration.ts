import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformConfiguration";
export function prepare_random_shopping_mall_platform_configuration(
  input?: DeepPartial<IShoppingMallPlatformConfiguration.ICreate>,
): IShoppingMallPlatformConfiguration.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.pick([
        "payment_gateway_enabled",
        "max_product_images",
        "checkout_timeout_seconds",
        "shipping_rate_calculation",
        "tax_calculation_enabled",
        "email_notification_enabled",
        "search_autocomplete_enabled",
        "cache_max_size_mb",
        "max_file_upload_size_mb",
        "admin_session_timeout_minutes",
      ] as const),
    value: (() => {
      const configValue = input?.value ? JSON.parse(input.value) : null;
      if (
        input?.name === "payment_gateway_enabled" ||
        input?.name === "tax_calculation_enabled" ||
        input?.name === "email_notification_enabled" ||
        input?.name === "search_autocomplete_enabled"
      ) {
        return JSON.stringify(
          input?.value ?? RandomGenerator.pick([true, false] as const),
        );
      } else if (
        input?.name === "checkout_timeout_seconds" ||
        input?.name === "admin_session_timeout_minutes"
      ) {
        return JSON.stringify(
          input?.value ??
            typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<30> &
                tags.Maximum<3600>
            >(),
        );
      } else if (input?.name === "max_product_images") {
        return JSON.stringify(
          input?.value ??
            typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
            >(),
        );
      } else if (input?.name === "max_file_upload_size_mb") {
        return JSON.stringify(
          input?.value ??
            typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<50>
            >(),
        );
      } else if (input?.name === "cache_max_size_mb") {
        return JSON.stringify(
          input?.value ??
            typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<10> &
                tags.Maximum<512>
            >(),
        );
      } else if (input?.name === "shipping_rate_calculation") {
        return JSON.stringify(
          input?.value ??
            RandomGenerator.pick([
              "flat_rate",
              "weight_based",
              "address_based",
              "product_category_based",
            ] as const),
        );
      } else if (input?.name === "external_api_url") {
        return JSON.stringify(
          input?.value ?? `https://${RandomGenerator.alphabets(8)}.com`,
        );
      } else {
        // Default for other string/complex settings
        const content = RandomGenerator.paragraph({
          sentences: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          wordMin: 3,
          wordMax: 8,
        });
        return JSON.stringify(input?.value ?? content);
      }
    })(),
    description:
      input?.description ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
        >(),
        wordMin: 3,
        wordMax: 8,
      }),
  };
}
