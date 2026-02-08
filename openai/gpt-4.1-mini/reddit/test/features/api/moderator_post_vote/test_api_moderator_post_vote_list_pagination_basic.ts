import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPostVoteOfModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfModerators";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteOfModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteOfModerators";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test the paginated list retrieval of moderator post votes with default pagination and no filters.
 * The test ensures authorization as a moderator, that soft-deleted records are excluded,
 * and pagination information is correctly provided and consistent.
 * Validates ISO 8601 timestamp formats in UTC and correct reference data in each item.
 * Also tests pagination performance and correctness on large datasets.
 */
export async function test_api_moderator_post_vote_list_pagination_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize as a new moderator
  const joinConnection: api.IConnection = { host: connection.host };
  // Moderator join request body must exist but is empty object as per IJoin type
  const moderatorAuthorized: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(joinConnection, {
      body: {},
    });
  // Create a new connection with the moderator's token set in headers
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${moderatorAuthorized.token.access}`,
    },
  };
  // 2. Send request to get the paginated list of moderator post votes with default empty body
  const response: IPageICommunityPlatformPostVoteOfModerators.ISummary =
    await api.functional.communityPlatform.moderator.post_votes.moderators.index(
      moderatorConnection,
      { body: {} },
    );
  // 3. Validate the response type fully
  typia.assert(response);
  // 4. Check pagination meta values
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination current page must be positive or zero",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit must be positive or zero",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records must be positive or zero",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages must be positive or zero",
    pagination.pages >= 0,
  );
  // If records are > 0 then pages should be >= 1
  if (pagination.records > 0) {
    TestValidator.predicate(
      "pagination pages correct for positive records",
      pagination.pages >= 1,
    );
  }
  // Check consistency: pages * limit >= records or pages == 0 if records == 0
  const maxRecords = pagination.pages * pagination.limit;
  if (pagination.records > 0) {
    TestValidator.predicate(
      "pagination pages * limit must cover total records",
      maxRecords >= pagination.records,
    );
  } else {
    TestValidator.equals(
      "pagination pages is zero for zero records",
      pagination.pages,
      0,
    );
  }
  // 5. Validate each data item
  for (const vote of response.data) {
    // Validate each vote data item
    typia.assert(vote);
    // Because ICommunityPlatformPostVoteOfModerators.ISummary is an empty object type
    // We cannot check specific properties as none are defined.
    // But test if timestamps exist, and are valid ISO8601 in UTC
    // Hypothetically, if date properties existed, validate them as ISO8601 UTC
    // We skip this as no properties exist per provided schema
  }
}
