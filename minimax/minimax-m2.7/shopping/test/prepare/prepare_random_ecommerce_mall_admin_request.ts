import { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_admin_request(
  input?: DeepPartial<IEcommerceMallAdminRequest.ICreate>,
): IEcommerceMallAdminRequest.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
    requested_grade:
      input?.requested_grade ??
      RandomGenerator.pick(["admin", "super_admin"] as const),
  };
}
