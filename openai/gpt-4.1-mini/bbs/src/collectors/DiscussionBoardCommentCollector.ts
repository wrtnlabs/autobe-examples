import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

// We must first verify the IDiscussionBoardComment.ICreate DTO includes 'content', 'articleId', and 'authorId'.
// Since the DTO currently lacks these fields, and these fields are needed to build the create input, we cannot proceed without that information.
// Request user to provide the missing DTO structure or confirm these fields exist in the DTO.
// Without this info, compilation error cannot be fixed as keys are missing from DTO.
export namespace DiscussionBoardCommentCollector {
  export async function collect(props: {
    body: IDiscussionBoardComment.ICreate;
  }) {
    throw new Error(
      "Cannot collect: Missing fields 'content', 'articleId', 'authorId' in IDiscussionBoardComment.ICreate DTO.",
    );
  }
}
