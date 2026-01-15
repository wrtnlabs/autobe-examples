import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerCommunicationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerCommunicationLog";
export function prepare_random_shopping_mall_seller_communication_log(
  input?: DeepPartial<IShoppingMallSellerCommunicationLog.ICreate>,
): IShoppingMallSellerCommunicationLog.ICreate {
  return {
    message:
      input?.message ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<3>
        >(),
        sentenceMin: 5,
        sentenceMax: 15,
        wordMin: 4,
        wordMax: 8,
      }),
  };
}
