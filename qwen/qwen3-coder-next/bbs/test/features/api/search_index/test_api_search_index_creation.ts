import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_search_indices_create } from "../../../generate/generate_random_discussion_board_search_indices_create";
import { prepare_random_discussion_board_search_index } from "../../../prepare/prepare_random_discussion_board_search_index";

export async function test_api_search_index_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member registration using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // Step 2: Create search index using authorized connection
  const searchIndex =
    await api.functional.discussionBoard.search.indices.create(
      memberConnection,
      {
        body: typia.random<IDiscussionBoardSearchIndex.ICreate>(),
      },
    );
  typia.assert(searchIndex);
}
