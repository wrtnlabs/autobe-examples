import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
export function prepare_random_discussion_board_attachment(
  input?: DeepPartial<IDiscussionBoardAttachment.ICreate>,
): IDiscussionBoardAttachment.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.alphabets(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<15>
        >(),
      ),
    extension:
      input?.extension ??
      RandomGenerator.pick([
        "jpg",
        "jpeg",
        "png",
        "gif",
        "pdf",
        "doc",
        "docx",
        "zip",
      ] as const),
    size:
      input?.size ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20971520>
      >(),
    mimetype:
      input?.mimetype ??
      (input?.extension
        ? ({
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            png: "image/png",
            gif: "image/gif",
            pdf: "application/pdf",
            doc: "application/msword",
            docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            zip: "application/zip",
          }[input.extension as string] ?? "application/octet-stream")
        : "application/octet-stream"),
    content_id:
      input?.content_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
