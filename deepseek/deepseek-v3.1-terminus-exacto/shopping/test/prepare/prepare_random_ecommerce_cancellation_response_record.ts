import { IEcommerceCancellationResponseRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationResponseRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_cancellation_response_record(
  input?: DeepPartial<IEcommerceCancellationResponseRecord.ICreate> | undefined,
): IEcommerceCancellationResponseRecord.ICreate {
  return {
    decision:
      input?.decision ??
      RandomGenerator.pick(["approved", "rejected"] as const),
    response_reason:
      input?.response_reason ??
      typia.random<string & tags.MinLength<10> & tags.MaxLength<500>>(),
  };
}
