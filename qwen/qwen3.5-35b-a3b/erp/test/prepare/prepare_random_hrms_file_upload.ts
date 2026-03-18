import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFileUpload";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrms_file_upload(
  input?: DeepPartial<IHrmsFileUpload.ICreate>,
): IHrmsFileUpload.ICreate {
  return {
    organization_id:
      input?.organization_id ?? typia.random<string & tags.Format<"uuid">>(),
    original_filename:
      input?.original_filename ?? RandomGenerator.alphabets(8) + ".pdf",
    file_type: input?.file_type ?? "application/pdf",
    file_size:
      input?.file_size ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1073741824>
      >(),
  };
}
