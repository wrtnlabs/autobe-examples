import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_refund_request(
  input?: DeepPartial<IEcommerceMallRefundRequest.ICreate>,
): IEcommerceMallRefundRequest.ICreate {
  return {
    orderItemId:
      input?.orderItemId ?? typia.random<string & tags.Format<"uuid">>(),
    reason:
      input?.reason ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 4,
      }),
  };
}
