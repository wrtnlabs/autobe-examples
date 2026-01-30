import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAttachmentFile";
export function prepare_random_economic_forum_attachment_file(
  input?: DeepPartial<IEconomicForumAttachmentFile.ICreate>,
): IEconomicForumAttachmentFile.ICreate {
  return {
    file_data:
      input?.file_data ??
      btoa(
        RandomGenerator.alphaNumeric(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<400>
          >(),
        ),
      ),
  };
}
