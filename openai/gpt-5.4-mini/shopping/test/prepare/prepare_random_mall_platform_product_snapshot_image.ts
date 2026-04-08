import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random product snapshot image creation data for E2E testing.
 *
 * Generates a complete IMallPlatformProductSnapshotImage.ICreate payload with
 * a valid URI-reference image path and a non-negative sort order. Any provided
 * DeepPartial overrides are respected, while missing fields are filled with
 * schema-compliant random values.
 */
export function prepare_random_mall_platform_product_snapshot_image(
  input?: DeepPartial<IMallPlatformProductSnapshotImage.ICreate> | undefined,
): IMallPlatformProductSnapshotImage.ICreate {
  return {
    imageUri:
      input?.imageUri ?? typia.random<string & tags.Format<"uri-reference">>(),
    sortOrder:
      input?.sortOrder ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  };
}
