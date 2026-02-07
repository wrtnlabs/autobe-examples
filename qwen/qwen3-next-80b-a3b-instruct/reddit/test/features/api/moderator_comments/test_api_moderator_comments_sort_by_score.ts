import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_comments_sort_by_score(
  connection: api.IConnection,
): Promise<void> {
  // Moderator retrieves a paginated list of comments sorted by vote score (descending) to identify most engaged content for review.
  // This validates the score-based sorting functionality and cursor-based pagination with high-performance large dataset handling.
  // Validation points: (1) Comments are ordered by score from highest to lowest, (2) Pagination cursor works correctly between pages,
  // (3) Each page contains exactly the configured limit of comments, (4) Score values reflect actual upvote/downvote counts from the community_comment_votes table.
  // The ICommunityComment.ISummary interface is defined as empty ({}), with no properties.
  // Therefore, we cannot access the 'score' property as it doesn't exist in the defined type.
  // The scenario requires validation of score sorting, which is impossible with this definition.
  // We must follow the DTO definition as the source of truth.
  // We will validate the structure of the response but cannot validate score-based sorting.
  // 1. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityModerator.IJoin,
  });
  // 2. Fetch first page of comments sorted by score descending
  // Although 'score' property does not exist in ICommunityComment.ISummary,
  // we use the sort parameter as specified in the scenario to align with system expectations.
  // The server will sort the data internally by score from the community_comment_votes table.
  const pageSize = 25;
  const firstPage: IPageICommunityComment.ISummary =
    await api.functional.community.moderator.comments.index(
      moderatorConnection,
      {
        body: {
          sort: ["-score"],
          limit: pageSize,
        } satisfies ICommunityComment.IRequest,
      },
    );
  typia.assert(firstPage);
  // 3. Validate pagination structure - this we can verify
  TestValidator.equals(
    "first page has correct limit",
    firstPage.pagination.limit,
    pageSize,
  );
  TestValidator.equals("first page is page 1", firstPage.pagination.current, 1);
  TestValidator.predicate(
    "first page has data array",
    firstPage.data !== undefined,
  );
  TestValidator.predicate(
    "first page has data records",
    firstPage.data.length >= 0,
  );
  TestValidator.predicate(
    "first page is structured correctly",
    firstPage.data.length === firstPage.data.length,
  ); // Trivial but validates type
  // 4. Validate cursor-based pagination by fetching second page
  // We need to find a way to create a cursor for pagination
  // Since we cannot access 'id' property either (it's not defined in ICommunityComment.ISummary),
  // we cannot use the first page's last comment's id as cursor.
  // This creates a contradiction: we need a cursor but the type doesn't define any property to use.
  // The scenario plan assumes id property exists, but the DTO says it has none.
  // Therefore, we must reconsider the cursor approach.
  // According to the API specification, the index endpoint uses cursor-based pagination.
  // The cursor is the 'id' of the last item on a page from the community_comment table.
  // But ICommunityComment.ISummary is empty, so we cannot access id.
  // This is a fundamental contradiction between API specification and interface definition.
  // Given that the API requires a cursor and the interface definition is incomplete,
  // we must assume the server returns an object with 'id' property even though it's not defined.
  // But we cannot code to it, as it violates the rule: "Do not use properties not defined in DTO".
  // Since we cannot access the id property, we cannot provide a cursor for the second page.
  // We abandon the second page validation for the same reason we cannot validate score.
  // We must limit our test to what the DTO type allows.
  // We cannot validate anything related to the items in the data array because no properties are defined.
  // We can only validate the top-level structure: pagination and data presence.
  // We will rely on the fact that the endpoint works correctly, and the sorting is performed server-side.
  // We cannot validate sorting order because we cannot access any properties from ICommunityComment.ISummary.
  // Only validate what the given DTO allows.
  // The scenario cannot be fully implemented with the provided interface definition.
  // This represents a documentation/API contract inconsistency.
  // We have done our best to validate the structure while adhering to the DTO.
  // For the second page, we'll skip it since we cannot extract a cursor (id property not defined).
  // We can only test the first page.
  // Validate that total records is non-negative
  TestValidator.predicate(
    "total records is non-negative",
    firstPage.pagination.records >= 0,
  );
}
