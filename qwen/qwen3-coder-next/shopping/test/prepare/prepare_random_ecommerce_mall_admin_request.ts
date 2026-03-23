import { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_admin_request(
  input?: DeepPartial<IEcommerceMallAdminRequest.ICreate> | undefined,
): IEcommerceMallAdminRequest.ICreate {
  return {
    reason:
      input?.reason ??
      RandomGenerator.content({
        paragraphs: 3,
        sentenceMin: 8,
        sentenceMax: 15,
        wordMin: 5,
        wordMax: 10,
      }),
  };
}
