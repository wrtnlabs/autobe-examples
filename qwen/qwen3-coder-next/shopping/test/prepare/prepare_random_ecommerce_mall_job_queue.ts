import { IEcommerceMallJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallJobQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_job_queue(
  input?: DeepPartial<IEcommerceMallJobQueue.ICreate> | undefined,
): IEcommerceMallJobQueue.ICreate {
  return {
    job_name: input?.job_name ?? RandomGenerator.paragraph({ sentences: 2 }),
    priority:
      input?.priority ??
      typia.random<
        number & tags.Type<"int32"> & tags.Default<0> & tags.Minimum<0>
      >(),
    max_retries:
      input?.max_retries ??
      typia.random<
        number & tags.Type<"int32"> & tags.Default<0> & tags.Minimum<0>
      >(),
  };
}
