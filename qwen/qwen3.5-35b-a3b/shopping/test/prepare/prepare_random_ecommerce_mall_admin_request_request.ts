import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_admin_request_request(
  input?: DeepPartial<IEcommerceMallAdminRequestRequest.ICreate> | undefined,
): IEcommerceMallAdminRequestRequest.ICreate {
  return {
    reason: input?.reason ?? typia.random<string & tags.MinLength<1>>(),
  };
}
