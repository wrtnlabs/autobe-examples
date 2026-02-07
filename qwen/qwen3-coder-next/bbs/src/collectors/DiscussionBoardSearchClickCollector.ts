import { IDiscussionBoardSearchClick } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchClick";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardSearchClickCollector {
  export async function collect(props: {
    body: IDiscussionBoardSearchClick.ICreate;
    searchQuery: IEntity;
    searchResult: IEntity;
    session?: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      clicked_at: new Date(),
      result_position: 0,
      session_id: props.session ? props.session.id : undefined,
      ip_address: undefined,
      query: { connect: { id: props.searchQuery.id } },
      result: { connect: { id: props.searchResult.id } },
      user: undefined,
    } satisfies Prisma.discussion_board_search_clicksCreateInput;
  }
}
