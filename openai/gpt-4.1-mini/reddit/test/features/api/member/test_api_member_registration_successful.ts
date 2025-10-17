import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

export async function test_api_member_registration_successful(
  connection: api.IConnection,
) {
  // Public endpoint for new user registration
  // 1. Generate valid member registration data
  const email: string = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // realistic password
  const requestBody = {
    email,
    password,
  } satisfies IRedditCommunityMember.ICreate;

  // 2. Call API to join/register new member
  const response: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: requestBody,
    });

  // 3. Validate the structure and required fields
  typia.assert(response);

  // 4. Verify important properties
  TestValidator.predicate(
    "response id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );
  TestValidator.equals("email matches", response.email, email);
  TestValidator.equals(
    "email verified is false",
    response.is_email_verified,
    false,
  );
  TestValidator.predicate(
    "password hash is non-empty",
    typeof response.password_hash === "string" &&
      response.password_hash.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO 8601",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
      response.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
      response.updated_at,
    ),
  );
  if (response.deleted_at !== undefined && response.deleted_at !== null) {
    TestValidator.predicate(
      "deleted_at is ISO 8601 or null",
      response.deleted_at === null ||
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
          response.deleted_at,
        ),
    );
  }

  // 5. Validate token object existence and structure
  TestValidator.predicate(
    "token is object",
    response.token !== null && typeof response.token === "object",
  );
  TestValidator.predicate(
    "token.access is string",
    typeof response.token.access === "string" &&
      response.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is string",
    typeof response.token.refresh === "string" &&
      response.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO 8601",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
      response.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO 8601",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
      response.token.refreshable_until,
    ),
  );
}
