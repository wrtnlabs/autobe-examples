import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random organization file metadata for E2E testing.
 *
 * Generates a complete {@link IHrmTimeTrackingOrganizationFile.ICreate} with
 * randomized values for file registration testing. All properties are
 * overridable via the optional `input` parameter.
 *
 * The generated data covers the full file metadata spectrum including original
 * filename, extension, MIME type, file size, storage URL, purpose type, and
 * optional version tracking. Useful for testing file upload workflows,
 * organization attachment management, and file-type-specific validation rules.
 *
 * @param input - Partial file metadata to override specific generated values
 * @returns Complete file metadata object conforming to ICreate
 */
export function prepare_random_hrm_time_tracking_organization_file(
  input?: DeepPartial<IHrmTimeTrackingOrganizationFile.ICreate> | undefined,
): IHrmTimeTrackingOrganizationFile.ICreate {
  return {
    name:
      input?.name ??
      `${RandomGenerator.name()}${input?.extension ? "." + input.extension : "." + RandomGenerator.alphabets(3)}`,
    extension:
      input?.extension ??
      RandomGenerator.pick([
        "png",
        "jpg",
        "pdf",
        "docx",
        "xlsx",
        "csv",
      ] as const),
    mimeType:
      input?.mimeType ??
      RandomGenerator.pick([
        "image/png",
        "image/jpeg",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/csv",
      ] as const),
    size:
      input?.size ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    url: input?.url ?? typia.random<string & tags.Format<"uri">>(),
    type:
      input?.type ??
      RandomGenerator.pick([
        "logo",
        "report_attachment",
        "contract",
        "invoice",
        "avatar",
      ] as const),
    version: input?.version !== undefined ? input.version : null,
  };
}
