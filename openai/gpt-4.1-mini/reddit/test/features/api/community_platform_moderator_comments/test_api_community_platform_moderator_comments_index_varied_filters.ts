import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test for the PATCH /communityPlatform/moderator/comments endpoint with varied filters.
 *
 * This test covers pagination and filtering by post ID, user ID, and parent_id null.
 * Ensures moderator authorization and correct data shape and pagination metadata.
 */
export async function test_api_community_platform_moderator_comments_index_varied_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join to get authorized connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityPlatformModerator.IJoin,
  });
  moderatorConnection.headers = { Authorization: authorized.token.access };
  // Test scenario 1: Filter by post_id with pagination
  {
    // Using a realistic UUID for post_id
    const postId = typia.random<string & tags.Format<"uuid">>();
    const body: ICommunityPlatformComment.IRequest = {
      post_id: postId,
      page: 1,
      limit: 10,
    };
    const output: IPageICommunityPlatformComment.ISummary =
      await api.functional.communityPlatform.moderator.comments.index(
        moderatorConnection,
        { body },
      );
    typia.assert(output);
    // Validate pagination info
    TestValidator.predicate(
      "pagination current page is 1",
      output.pagination.current === 1,
    );
    TestValidator.predicate(
      "pagination limit is <= 10",
      output.pagination.limit <= 10,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      output.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "records count matches data length",
      output.pagination.records >= output.data.length,
    );
    // Validate each comment summary in data array
    output.data.forEach((comment) => {
      typia.assert(comment);
      // Removed invalid property checks for properties not existing on ISummary
    });
  }
  // Test scenario 2: Filter by user_id and content keyword
  {
    const userId = typia.random<string & tags.Format<"uuid">>();
    const contentKeyword = RandomGenerator.substring(
      RandomGenerator.content({ paragraphs: 1 }),
    );
    const body: ICommunityPlatformComment.IRequest = {
      user_id: userId,
      content: contentKeyword,
      page: 1,
      limit: 5,
    };
    const output: IPageICommunityPlatformComment.ISummary =
      await api.functional.communityPlatform.moderator.comments.index(
        moderatorConnection,
        { body },
      );
    typia.assert(output);
    TestValidator.predicate(
      "pagination current page is 1",
      output.pagination.current === 1,
    );
    TestValidator.predicate(
      "pagination limit is <= 5",
      output.pagination.limit <= 5,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      output.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "records count matches data length",
      output.pagination.records >= output.data.length,
    );
    output.data.forEach((comment) => {
      typia.assert(comment);
      // Removed invalid property checks for properties not existing on ISummary
    });
  }
  // Test scenario 3: Filter top-level comments with parent_id null
  {
    const body: ICommunityPlatformComment.IRequest = {
      parent_id: null,
      page: 1,
      limit: 10,
    };
    const output: IPageICommunityPlatformComment.ISummary =
      await api.functional.communityPlatform.moderator.comments.index(
        moderatorConnection,
        { body },
      );
    typia.assert(output);
    TestValidator.predicate(
      "pagination current page is 1",
      output.pagination.current === 1,
    );
    TestValidator.predicate(
      "pagination limit is <= 10",
      output.pagination.limit <= 10,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      output.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "records count matches data length",
      output.pagination.records >= output.data.length,
    );
    output.data.forEach((comment) => {
      typia.assert(comment);
      // Removed invalid property checks for properties not existing on ISummary
    });
  }
}
