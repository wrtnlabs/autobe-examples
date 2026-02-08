import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

function toISOStringSafe(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}
export namespace DiscussionBoardArticleCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticle.ICreate;
    discussionBoardRegisteredUsers: IEntity;
    section: IEntity;
  }) {
    const id = v4();
    return {
      id,
      title: "",
      content: "",
      created_at: toISOStringSafe(new Date()) ?? new Date().toISOString(),
      updated_at: toISOStringSafe(new Date()) ?? new Date().toISOString(),
      deleted_at: null,
      author: { connect: { id: props.discussionBoardRegisteredUsers.id } },
      section: { connect: { id: props.section.id } },
    } satisfies Prisma.discussion_board_articlesCreateInput;
  }
}
