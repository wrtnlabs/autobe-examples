import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberEmailVerification";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary success path for retrieving a member's email verification records.
 *
 * Validates the email verification list endpoint by first registering a new member,
 * then retrieving their verification records. Ensures the endpoint correctly returns
 * paginated results with all required fields while maintaining security by not
 * exposing full token values.
 *
 * Special attention is given to verifying the pagination metadata, ensuring at least
 * one verification record exists from registration, and confirming the member reference
 * matches the authenticated user.
 *
 * 1. Register a new member account with randomized credentials.
 * 2. Authenticate and receive authorization tokens.
 * 3. Call the email verification list endpoint for the authenticated member.
 * 4. Validate pagination metadata structure and values.
 * 5. Verify at least one verification record is returned.
 * 6. Check all required fields in each record are present and valid.
 * 7. Confirm member reference matches the authenticated member.
 * 8. Verify token is masked/shortened for security.
 * 9. Validate expiration timestamp reflects active status.
 */
export async function test_api_email_verification_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const authConnection: api.IConnection = { host: connection.host };
  const authorized: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(authConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(authorized);
  // 2. Create member-specific connection for API calls
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...connection.headers,
    Authorization: authorized.token.access,
  };
  // 3. Retrieve email verification records
  const response: IPageIRedditCommunityMemberEmailVerification.ISummary =
    await api.functional.redditCommunity.member.email_verifications.index(
      memberConnection,
      {
        body: {
          reddit_community_member_id: authorized.id,
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records positive",
    response.pagination.records > 0,
  );
  TestValidator.equals(
    "pagination pages calculation",
    response.pagination.pages,
    Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 5. Verify at least one verification record exists
  TestValidator.predicate(
    "at least one verification record",
    response.data.length >= 1,
  );
  // 6. Validate each record contains required fields
  for (const verification of response.data) {
    typia.assert(verification);
    // Check all required fields exist
    TestValidator.predicate("has valid id", verification.id !== undefined);
    TestValidator.predicate("has token", verification.token !== undefined);
    TestValidator.predicate(
      "has expires_at",
      verification.expires_at !== undefined,
    );
    TestValidator.predicate(
      "has created_at",
      verification.created_at !== undefined,
    );
    TestValidator.predicate(
      "has updated_at",
      verification.updated_at !== undefined,
    );
    TestValidator.predicate(
      "has reddit_community_member_id",
      verification.reddit_community_member_id !== undefined,
    );
    TestValidator.predicate(
      "has member reference",
      verification.member !== undefined,
    );
    // Verify UUID format for id fields
    TestValidator.predicate(
      "id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        verification.id,
      ),
    );
    TestValidator.predicate(
      "member id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        verification.reddit_community_member_id,
      ),
    );
    TestValidator.predicate(
      "member reference id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        verification.member.id,
      ),
    );
    // Verify token is masked (shortened for security)
    TestValidator.predicate("token is masked", verification.token.length <= 40);
    // Verify expiration is in the future (active status)
    const expiresDate = new Date(verification.expires_at);
    TestValidator.predicate(
      "expires_at is in the future",
      expiresDate > new Date(),
    );
    // Verify member reference matches authenticated member
    TestValidator.equals(
      "member reference matches authenticated member",
      verification.member.id,
      authorized.id,
    );
    // Verify member reference contains expected fields
    TestValidator.predicate(
      "member has username",
      verification.member.username !== undefined,
    );
    TestValidator.predicate(
      "member has created_at",
      verification.member.created_at !== undefined,
    );
    TestValidator.predicate(
      "member has updated_at",
      verification.member.updated_at !== undefined,
    );
    // Verify timestamps are valid ISO 8601 format
    new Date(verification.created_at);
    new Date(verification.updated_at);
    new Date(verification.expires_at);
    new Date(authorized.created_at);
    new Date(authorized.updated_at);
  }
}
