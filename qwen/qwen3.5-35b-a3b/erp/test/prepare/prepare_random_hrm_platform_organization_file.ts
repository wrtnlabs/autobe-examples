import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random organization file upload data for E2E testing.
 *
 * Generates a complete IHrmPlatformOrganizationFile.ICreate with randomized
 * file metadata including storage key, filename, MIME type, size, storage
 * backend, and lifecycle status for testing file upload scenarios.
 */
export function prepare_random_hrm_platform_organization_file(
  input?: DeepPartial<IHrmPlatformOrganizationFile.ICreate>,
): IHrmPlatformOrganizationFile.ICreate {
  return {
    file_key: input?.file_key ?? typia.random<string & tags.Format<"uuid">>(),
    file_name: input?.file_name ?? RandomGenerator.alphaNumeric(16) + ".pdf",
    file_type:
      input?.file_type ??
      RandomGenerator.pick([
        "image/png",
        "application/pdf",
        "image/jpeg",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ] as const),
    file_size:
      input?.file_size ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1073741824>
      >(),
    storage_type:
      input?.storage_type ??
      RandomGenerator.pick(["s3", "local", "gcs"] as const),
    url:
      input?.url ??
      (Math.random() > 0.3
        ? typia.random<string & tags.Format<"uri">>()
        : null),
    status:
      input?.status ??
      RandomGenerator.pick(["active", "deleted", "archived"] as const),
  };
}
