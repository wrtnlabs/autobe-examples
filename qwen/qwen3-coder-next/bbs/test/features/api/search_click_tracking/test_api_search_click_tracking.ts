import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSearchClick } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchClick";
import type { IDiscussionBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchResult";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSearchResult";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_search_clicks_create_click } from "../../../generate/generate_random_discussion_board_search_clicks_create_click";
import { prepare_random_discussion_board_search_click } from "../../../prepare/prepare_random_discussion_board_search_click";

export async function test_api_search_click_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member connection through registration
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.member.join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // 2. Log a search query for analytics tracking
  await api.functional.discussionBoard.search.queries.log(memberConnection);
  // 3. Retrieve search results
  const searchResults =
    await api.functional.discussionBoard.search.results.index(memberConnection);
  typia.assert(searchResults);
  // 4. Submit a search click event with proper references
  // Note: The DTO definitions show IDiscussionBoardSearchClick.ICreate has no required fields currently,
  // so we use typia.random for testing purposes
  const clickEvent =
    await api.functional.discussionBoard.search.clicks.createClick(
      memberConnection,
      {
        body: typia.random<IDiscussionBoardSearchClick.ICreate>(),
      },
    );
  typia.assert(clickEvent);
  // 5. Validate the click event was recorded
  TestValidator.predicate("click event recorded", clickEvent !== null);
}
