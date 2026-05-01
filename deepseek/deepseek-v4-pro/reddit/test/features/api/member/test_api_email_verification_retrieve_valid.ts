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
 * Test retrieving a valid email verification record for a newly registered member.
 *
 * Validates the complete retrieval flow for email verification tokens generated during member registration. First, a member account is registered via the join endpoint, which automatically generates an email verification token during account creation. Then the member's verification tokens are listed via the index endpoint to obtain a valid verificationId. Finally, the specific verification record is retrieved and validated for correctness.
 *
 * The test confirms that the retrieved record contains all required ICommunityHubMemberEmailVerification fields: a unique UUID identifier, a cryptographically random token string, a created_at timestamp indicating when the verification email was dispatched, an expired_at timestamp defining the token's validity window, and the associated member summary containing the member's public profile information (username, display_name, avatar_uri, karma, created_at). Expired tokens are still returned — expiration is a property of the record, not a retrieval filter, and consumers are responsible for checking expired_at against the current time.
 *
 * 1. Register a new member via join, which generates an email verification token.
 * 2. List the member's verification tokens via the index endpoint to obtain a valid verificationId.
 * 3. Retrieve the specific verification record using the member's username and verificationId.
 * 4. Validate all response fields against the ICommunityHubMemberEmailVerification structure.
 */
export async function test_api_email_verification_retrieve_valid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. List email verification tokens
  const page =
    await api.functional.communityHub.members.email_verifications.index(
      memberConnection,
      {
        username: authorized.username,
        body: {} satisfies ICommunityHubMemberEmailVerification.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.predicate("verification tokens exist", page.data.length > 0);
  // 3. Retrieve specific verification record
  const verificationId = page.data[0].id;
  const verification =
    await api.functional.communityHub.members.email_verifications.at(
      memberConnection,
      {
        username: authorized.username,
        verificationId,
      },
    );
  typia.assert(verification);
  // 4. Validate response fields
  TestValidator.equals(
    "verification id matches",
    verification.id,
    verificationId,
  );
  TestValidator.predicate("token is non-empty", verification.token.length > 0);
  TestValidator.predicate("created_at is set", verification.created_at !== "");
  TestValidator.predicate("expired_at is set", verification.expired_at !== "");
  TestValidator.equals(
    "member username matches",
    verification.member.username,
    authorized.username,
  );
  TestValidator.equals(
    "member display name matches",
    verification.member.display_name,
    authorized.display_name,
  );
  TestValidator.equals(
    "member id matches",
    verification.member.id,
    authorized.id,
  );
}
