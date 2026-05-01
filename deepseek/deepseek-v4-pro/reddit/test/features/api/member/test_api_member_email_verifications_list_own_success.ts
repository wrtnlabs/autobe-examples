import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberEmailVerification";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test listing own email verification tokens after member registration.
 *
 * Validates that when a new member registers via the join endpoint, an email
 * verification token is automatically generated and can be retrieved through the
 * member's email verification listing endpoint. The test confirms the verification
 * token's structure and business rules are correctly implemented.
 *
 * Special attention is given to verifying that the token is in a valid state
 * immediately after creation — the expired_at timestamp must be in the future.
 * The associated member summary within each token must match the authenticated
 * member's identity, and pagination metadata must accurately reflect the
 * returned data set.
 *
 * 1. Register a new member through the join endpoint, which triggers automatic
 *    email verification token generation.
 * 2. Retrieve the paginated list of email verification tokens for the same
 *    member using their username as the path parameter.
 * 3. Validate at least one verification token exists with complete metadata.
 * 4. Confirm all tokens are valid (expired_at is in the future relative to now).
 * 5. Verify the embedded member reference matches the authenticated member.
 * 6. Validate pagination metadata consistency (current, limit, records, pages).
 */
export async function test_api_member_email_verifications_list_own_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. List email verification tokens for the authenticated member
  const result =
    await api.functional.communityHub.members.email_verifications.index(
      memberConnection,
      {
        username: member.username,
        body: {} satisfies ICommunityHubMemberEmailVerification.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate at least one verification token exists
  TestValidator.predicate(
    "at least one verification token exists",
    result.data.length >= 1,
  );
  // 4. Validate all tokens are valid (not expired)
  const now = new Date().toISOString();
  for (const verification of result.data) {
    TestValidator.predicate(
      "verification token is valid (expired_at is in the future)",
      verification.expired_at > now,
    );
  }
  // 5. Validate member reference matches the authenticated member
  const firstVerification = result.data[0];
  TestValidator.equals(
    "member id matches authenticated member",
    firstVerification.member.id,
    member.id,
  );
  TestValidator.equals(
    "member username matches authenticated member",
    firstVerification.member.username,
    member.username,
  );
  // 6. Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination current page is at least 1",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is at least 1",
    result.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination total records is at least data length",
    result.pagination.records >= result.data.length,
  );
  TestValidator.predicate(
    "pagination pages count is correctly calculated",
    result.pagination.pages ===
      Math.ceil(result.pagination.records / result.pagination.limit),
  );
}
