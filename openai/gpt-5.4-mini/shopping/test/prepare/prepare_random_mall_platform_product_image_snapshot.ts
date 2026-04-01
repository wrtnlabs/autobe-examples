import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_mall_platform_product_image_snapshot(
  input?: DeepPartial<IMallPlatformProductImageSnapshot.ICreate> | undefined,
): IMallPlatformProductImageSnapshot.ICreate {
  input;
  return {};
}
