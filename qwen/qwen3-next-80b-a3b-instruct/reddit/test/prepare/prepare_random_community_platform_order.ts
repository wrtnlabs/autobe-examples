import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrder";
export function prepare_random_community_platform_order(
  input?: DeepPartial<ICommunityPlatformOrder.ICreate> | undefined,
): ICommunityPlatformOrder.ICreate {
  return {
    cartId: input?.cartId ?? typia.random<string & tags.Format<"uuid">>(),
    shipping_address_id:
      input?.shipping_address_id ??
      typia.random<string & tags.Format<"uuid">>(),
    billing_address_id:
      input?.billing_address_id ?? typia.random<string & tags.Format<"uuid">>(),
    delivery_window_id:
      input?.delivery_window_id ?? typia.random<string & tags.Format<"uuid">>(),
    carrier_id:
      input?.carrier_id ?? typia.random<string & tags.Format<"uuid">>(),
    shipping_method:
      input?.shipping_method ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 10 }),
    currency_code:
      input?.currency_code ?? RandomGenerator.alphaNumeric(3).toUpperCase(),
  };
}
