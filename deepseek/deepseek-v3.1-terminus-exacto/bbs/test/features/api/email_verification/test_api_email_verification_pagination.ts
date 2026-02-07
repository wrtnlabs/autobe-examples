import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_email_verification_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple users to generate email verification records
  const createdUsers: api.IConnection[] = [];
  // Create 15 users to have enough records for pagination testing
  for (let i = 0; i < 15; i++) {
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      },
    });
    createdUsers.push(userConnection);
  }
  // Create a dedicated connection for email verification search
  const searchConnection: api.IConnection = { host: connection.host };
  // Test pagination with default parameters (page 1, limit 20)
  const defaultPageResponse =
    await api.functional.discussionBoard.user.email_verifications.index(
      searchConnection,
      {
        body: {
          user_type: "user",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserEmailVerification.IRequest,
      },
    );
  const defaultPage = typia.assert(defaultPageResponse);
  // Verify pagination metadata
  TestValidator.equals(
    "current page should be 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 20", defaultPage.pagination.limit, 20);
  TestValidator.predicate(
    "total records should be at least 15",
    defaultPage.pagination.records >= 15,
  );
  TestValidator.predicate(
    "total pages should be calculated correctly",
    defaultPage.pagination.pages ===
      Math.ceil(defaultPage.pagination.records / defaultPage.pagination.limit),
  );
  // Test pagination with custom limit (5 records per page)
  const customLimitResponse =
    await api.functional.discussionBoard.user.email_verifications.index(
      searchConnection,
      {
        body: {
          user_type: "user",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardUserEmailVerification.IRequest,
      },
    );
  const customLimitPage = typia.assert(customLimitResponse);
  TestValidator.equals(
    "current page should be 1",
    customLimitPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 5",
    customLimitPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data count should match limit",
    customLimitPage.data.length <= 5,
  );
  // Test pagination with page 2
  const page2Response =
    await api.functional.discussionBoard.user.email_verifications.index(
      searchConnection,
      {
        body: {
          user_type: "user",
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardUserEmailVerification.IRequest,
      },
    );
  const page2 = typia.assert(page2Response);
  TestValidator.equals("current page should be 2", page2.pagination.current, 2);
  TestValidator.equals("limit should be 5", page2.pagination.limit, 5);
  // Test pagination with page beyond total pages (should return empty data)
  const beyondPageResponse =
    await api.functional.discussionBoard.user.email_verifications.index(
      searchConnection,
      {
        body: {
          user_type: "user",
          page: 100,
          limit: 5,
        } satisfies IDiscussionBoardUserEmailVerification.IRequest,
      },
    );
  const beyondPage = typia.assert(beyondPageResponse);
  TestValidator.equals(
    "current page should be 100",
    beyondPage.pagination.current,
    100,
  );
  TestValidator.equals("limit should be 5", beyondPage.pagination.limit, 5);
  TestValidator.equals(
    "data should be empty for beyond page",
    beyondPage.data.length,
    0,
  );
  // Test pagination with minimum limit
  const minLimitResponse =
    await api.functional.discussionBoard.user.email_verifications.index(
      searchConnection,
      {
        body: {
          user_type: "user",
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardUserEmailVerification.IRequest,
      },
    );
  const minLimitPage = typia.assert(minLimitResponse);
  TestValidator.equals(
    "current page should be 1",
    minLimitPage.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 1", minLimitPage.pagination.limit, 1);
  // Test pagination with maximum limit
  const maxLimitResponse =
    await api.functional.discussionBoard.user.email_verifications.index(
      searchConnection,
      {
        body: {
          user_type: "user",
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardUserEmailVerification.IRequest,
      },
    );
  const maxLimitPage = typia.assert(maxLimitResponse);
  TestValidator.equals(
    "current page should be 1",
    maxLimitPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 100",
    maxLimitPage.pagination.limit,
    100,
  );
  // Verify that pagination metadata remains consistent across different queries
  TestValidator.equals(
    "total records should be consistent",
    defaultPage.pagination.records,
    customLimitPage.pagination.records,
  );
  TestValidator.equals(
    "total pages should be consistent",
    defaultPage.pagination.pages,
    customLimitPage.pagination.pages,
  );
  // Test edge case: page 0 (should default to page 1)
  const pageZeroResponse =
    await api.functional.discussionBoard.user.email_verifications.index(
      searchConnection,
      {
        body: {
          user_type: "user",
          page: 0,
          limit: 5,
        } satisfies IDiscussionBoardUserEmailVerification.IRequest,
      },
    );
  const pageZero = typia.assert(pageZeroResponse);
  TestValidator.equals(
    "page 0 should default to page 1",
    pageZero.pagination.current,
    1,
  );
}
