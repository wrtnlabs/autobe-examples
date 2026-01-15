import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallComplianceFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComplianceFile";
export function prepare_random_shopping_mall_compliance_file(
  input?: DeepPartial<IShoppingMallComplianceFile.ICreate>,
): IShoppingMallComplianceFile.ICreate {
  return {
    file_name:
      input?.file_name ??
      `${RandomGenerator.alphabets(typia.random<number & tags.Type<"uint32"> & tags.Minimum<5> & tags.Maximum<15>>())}.${RandomGenerator.pick(["pdf", "png", "docx", "jpg", "txt"] as const)}`,
    file_size:
      input?.file_size ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
      >(),
    file_type:
      input?.file_type ??
      RandomGenerator.pick([
        "application/pdf",
        "image/jpeg",
        "image/png",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ] as const),
    content_hash:
      input?.content_hash ??
      typia.random<string & tags.Pattern<"^[a-f0-9]{64}$">>(),
  };
}
