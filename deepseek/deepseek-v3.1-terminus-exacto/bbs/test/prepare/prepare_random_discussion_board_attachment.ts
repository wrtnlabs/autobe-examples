import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_attachment(
  input?: DeepPartial<IDiscussionBoardAttachment.ICreate>,
): IDiscussionBoardAttachment.ICreate {
  // Common file extension to MIME type mapping
  const fileExtensionToMimeType: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    jpg: "image/jpeg",
    png: "image/png",
    txt: "text/plain",
    zip: "application/zip",
    mp4: "video/mp4",
    mp3: "audio/mpeg",
  };
  // Generate a realistic filename with random base and common extension
  const filename =
    input?.filename ??
    (() => {
      const baseName = RandomGenerator.alphabets(8).toLowerCase();
      const extensions = Object.keys(fileExtensionToMimeType);
      const extension = RandomGenerator.pick(extensions as readonly string[]);
      return `${baseName}.${extension}`;
    })();
  // Extract filetype from filename extension
  const filetype =
    input?.filetype ??
    (() => {
      const extension = filename.split(".").pop()?.toLowerCase() ?? "txt";
      return extension;
    })();
  // Determine MIME type based on filetype
  const mime_type =
    input?.mime_type ??
    (() => {
      return fileExtensionToMimeType[filetype] ?? "application/octet-stream";
    })();
  // Generate file size with int32 constraint and minimum 1 byte
  const size_bytes =
    input?.size_bytes ??
    typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>();
  return {
    filename,
    filetype,
    mime_type,
    size_bytes,
  };
}
