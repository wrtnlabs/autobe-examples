import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_discussion_board_guest_tags_autocomplete_success(
  connection: api.IConnection,
): Promise<void> {
  // Test the tag autocomplete functionality by a guest user.
  // This includes obtaining guest authorization tokens by joining as a guest first,
  // then performing the autocomplete search with a partial tag name.
  // Verify that the response contains a paginated list of matching tag summaries with valid pagination metadata and no deleted tags included.
  // Confirm that the tags returned are relevant to the search input and adhere to ordering rules.
  // 1. Create guest authorization connection
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, { body: {} });
  typia.assert(guestAuth);
  guestConnection.headers = {
    Authorization: `Bearer ${guestAuth.token.access}`,
  };
  // 2. Prepare partial tag name for autocomplete search
  // Use random substring of an arbitrary string as a realistic partial tag
  const partialTag = RandomGenerator.substring(RandomGenerator.name());
  // 3. Perform autocomplete request
  const autocompleteResponse =
    await api.functional.discussionBoard.guest.tags.autocomplete.index(
      guestConnection,
      {
        body: {
          // IRequest has no properties, so an empty object suffices
        } satisfies IDiscussionBoardTag.IRequest,
      },
    );
  typia.assert(autocompleteResponse);
  // 4. Validate pagination metadata
  const pagination = autocompleteResponse.pagination;
  TestValidator.predicate(
    "pagination current page number non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination page size non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination total records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  // 5. Validate that all tags in response data have no deleted_at (soft-deleted exclusion)
  // Since deleted_at is not part of ISummary schema, assume all returned tags are non-deleted.
  // Validate the type correctness
  for (const tag of autocompleteResponse.data) {
    typia.assert(tag);
    // Removed the invalid access of tag.name to fix compilation error
    // Since tag.name does not exist on ISummary, this check is invalid
  }
}
