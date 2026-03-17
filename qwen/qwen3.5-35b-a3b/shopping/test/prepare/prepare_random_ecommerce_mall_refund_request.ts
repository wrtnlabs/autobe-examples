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
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
    evidence_description:
      input?.evidence_description ??
      (Math.random() > 0.5
        ? RandomGenerator.paragraph({ sentences: 1 })
        : null),
  };
}
