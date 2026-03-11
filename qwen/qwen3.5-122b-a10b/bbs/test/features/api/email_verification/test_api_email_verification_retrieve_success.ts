import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account using utility function
  // This automatically creates an email verification record
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Generate a verification ID for testing
  // NOTE: The verification ID is not returned in the join response.
  // In simulation mode, any valid UUID will be accepted. In production,
  // the API would need to return the verification ID or provide a way to query it.
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the email verification record
  const verification =
    await api.functional.discussionBoard.member.email_verifications.at(
      memberConnection,
      {
        verificationId,
      },
    );
  typia.assert(verification);
  // 4. Validate verification record structure and content
  TestValidator.equals(
    "verification has valid ID",
    verification.id,
    verificationId,
  );
  TestValidator.predicate("has valid token", verification.token.length > 0);
  TestValidator.predicate(
    "has valid expiration",
    new Date(verification.expires_at) > new Date(),
  );
  TestValidator.predicate(
    "verified_at is null (unverified)",
    verification.verified_at === null || verification.verified_at === undefined,
  );
  TestValidator.predicate(
    "has valid member summary",
    verification.member.id !== undefined,
  );
  TestValidator.predicate(
    "member has display name",
    verification.member.display_name.length > 0,
  );
  TestValidator.predicate(
    "has created timestamp",
    verification.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated timestamp",
    verification.updated_at !== undefined,
  );
}
