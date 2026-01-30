import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAttachmentFile";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicForumAttachmentFileCollector {
  export async function collect(props: {
    body: IEconomicForumAttachmentFile.ICreate;
  }) {
    return {
      id: v4(),
      hashed_filename: "",
      original_filename: "",
      mime_type: "",
      size: 0,
      created_at: new Date(),
    } satisfies Prisma.economic_forum_attachment_filesCreateInput;
  }
}
