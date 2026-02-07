import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleFileCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticleFile.ICreate;
    discussionBoardArticles: IEntity;
    discussionBoardUsers: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields from DTO
      id,
      file_name: props.body.file_name,
      file_type: props.body.file_type,
      file_size: props.body.file_size,
      storage_path: props.body.storage_path,
      description: props.body.description ?? null,
      // Generated scalar fields
      download_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // Scalar field from props
      uploaded_by: props.discussionBoardUsers.id,
      // Relations
      article: { connect: { id: props.discussionBoardArticles.id } },
    } satisfies Prisma.discussion_board_article_filesCreateInput;
  }
}
