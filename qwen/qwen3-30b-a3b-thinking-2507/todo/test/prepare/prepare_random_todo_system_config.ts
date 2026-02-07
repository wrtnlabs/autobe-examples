import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoSystemConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_todo_system_config(
  input?: DeepPartial<ITodoSystemConfig.ICreate>,
): ITodoSystemConfig.ICreate {
  return {
    email_verification_timeout:
      input?.email_verification_timeout ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    password_reset_timeout:
      input?.password_reset_timeout ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    feature_flags:
      input?.feature_flags ??
      JSON.stringify({
        featureA: typia.random<boolean>(),
        featureB: typia.random<boolean>(),
        featureC: typia.random<boolean>(),
      }),
  };
}
