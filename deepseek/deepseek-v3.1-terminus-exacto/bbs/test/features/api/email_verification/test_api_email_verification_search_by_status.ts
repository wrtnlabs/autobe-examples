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

export async function test_api_email_verification_search_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate multiple users
  const authenticatedConnections = await Promise.all(
    ArrayUtil.repeat(3, async () => {
      const userConnection: api.IConnection = { host: connection.host };
      await authorize_user_join(userConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardUser.IJoin,
      });
      return userConnection;
    }),
  );
  // Use the first authenticated connection for searching
  const searchConnection = authenticatedConnections[0];
  // Search for all email verification records
  const allRecords =
    await api.functional.discussionBoard.user.email_verifications.index(
      searchConnection,
      {
        body: {
          user_type: "user",
          verification_status: null,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardUserEmailVerification.IRequest,
      },
    );
  typia.assert(allRecords);
  // Test filtering by 'pending' status (newly created users should be pending)
  const pendingRecords =
    await api.functional.discussionBoard.user.email_verifications.index(
      searchConnection,
      {
        body: {
          user_type: "user",
          verification_status: "pending",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardUserEmailVerification.IRequest,
      },
    );
  typia.assert(pendingRecords);
  // Test filtering by 'verified' status (should be empty for new users)
  const verifiedRecords =
    await api.functional.discussionBoard.user.email_verifications.index(
      searchConnection,
      {
        body: {
          user_type: "user",
          verification_status: "verified",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardUserEmailVerification.IRequest,
      },
    );
  typia.assert(verifiedRecords);
  // Test filtering by 'expired' status (should be empty for new users)
  const expiredRecords =
    await api.functional.discussionBoard.user.email_verifications.index(
      searchConnection,
      {
        body: {
          user_type: "user",
          verification_status: "expired",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardUserEmailVerification.IRequest,
      },
    );
  typia.assert(expiredRecords);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    allRecords.pagination !== undefined,
  );
  TestValidator.equals("current page", allRecords.pagination.current, 1);
  TestValidator.predicate("limit is positive", allRecords.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    allRecords.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    allRecords.pagination.pages >= 0,
  );
  // Validate that status filtering works correctly
  // Newly created users should be in pending state
  TestValidator.predicate(
    "pending records should include newly created users",
    pendingRecords.data.length >= 3,
  );
  TestValidator.predicate(
    "verified records should be empty for new users",
    verifiedRecords.data.length === 0,
  );
  TestValidator.predicate(
    "expired records should be empty for new users",
    expiredRecords.data.length === 0,
  );
  // Validate that each filtered result set is a subset of the complete set
  const allIds = new Set(allRecords.data.map((record) => record.id));
  TestValidator.predicate(
    "pending records are subset of all records",
    pendingRecords.data.every((record) => allIds.has(record.id)),
  );
  TestValidator.predicate(
    "verified records are subset of all records",
    verifiedRecords.data.every((record) => allIds.has(record.id)),
  );
  TestValidator.predicate(
    "expired records are subset of all records",
    expiredRecords.data.every((record) => allIds.has(record.id)),
  );
}
