import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleFileCollector {
  function toISOStringSafe(date: Date): string {
    // fallback method to convert Date to string
    // since MyGlobal.toISOStringSafe possibly missing type declaration
    return date.toISOString();
  }
  export async function collect(props: {
    body: IDiscussionBoardArticleFile.ICreate;
    discussionBoardArticles: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      file_name: (props.body as any).file_name ?? null,
      file_type: (props.body as any).file_type ?? null,
      file_size: (props.body as any).file_size ?? null,
      download_url: (props.body as any).download_url ?? null,
      display_order: (props.body as any).display_order ?? null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: (props.body as any).deleted_at ?? null,
      article: { connect: { id: props.discussionBoardArticles.id } },
    } satisfies Prisma.discussion_board_article_filesCreateInput;
  }
}
